import { getServerSession } from "next-auth";
import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";

const ALLOWED_TABLES = [
    'users', 'teachers', 'students', 'classes', 'pending_teachers',
    'classes_view', 'students_view', 'teachers_view', 'courses'
];

const DISALLOWED_FIELDS = {
    'users': [],
    'pending_teachers': [],
};

const TABLE_PRIMARY_KEYS = {
    'courses': 'course_id', 
    'classes_view': 'class_id', 
    'students_view': 'user_id', 
    'teachers_view': 'user_id',
    'users': 'user_id', 
    'teachers': 'user_id', 
    'students': 'user_id',
    'classes': 'class_id', 
    'pending_teachers': 'pending_id',
};

const REQUIRED_FIELDS = {
    'courses': ['course_name'],
    'classes': ['course_id', 'teacher_id', 'grade_id', 'start_time', 'end_time'],
    'users': ['user_name', 'user_email'],
    'pending_teachers': ['user_name', 'user_email'],
};


const VIEW_TABLE_MAP = {
    'teachers_view': {
        userTable: 'users',
        relatedTable: 'teachers',
        userLevel: 1,
        userFields: ['user_id', 'user_passkey', 'user_name', 'user_email', 'contact', 'address'], // Added user_id
        relatedFields: ['user_id', 'experience', 'qualification'] // Added user_id
    },
    'students_view': {
        userTable: 'users',
        relatedTable: 'students',
        userLevel: 0,
        userFields: ['user_id', 'user_name', 'user_email', 'contact', 'address'], // Added user_id
        relatedFields: ['user_id', 'guardian_name', 'guardian_relation', 'guardian_contact', 'school', 'date_of_birth', 'class'] // Added user_id
    },
    'classes_view': {
        relatedTable: 'classes',
        relatedFields: ['course_id', 'teacher_id', 'grade_id', 'start_time', 'end_time', 'class_description']
    }
};


function validateField(table, field) {
    return /^[a-zA-Z0-9_]+$/.test(field) &&
        !(DISALLOWED_FIELDS[table]?.includes(field));
}

function isValidTable(tableName) {
    return /^[a-zA-Z0-9_\-.$]+$/.test(tableName) && ALLOWED_TABLES.includes(tableName);
}

function validateRequiredFields(table, data) {
    const required = REQUIRED_FIELDS[table] || [];
    const missing = required.filter(field => !data[field]);
    return { isValid: missing.length === 0, missingFields: missing };
}

function sanitizeData(table, data, userId) {
    const sanitized = {};
    const rejected = [];

    for (const [key, value] of Object.entries(data)) {
        if (validateField(table, key)) {
            if (typeof value === 'string' && value.length > 5000) {
                throw new Error(`Field value too large for ${key}`);
            }
            sanitized[key] = value;
        } else {
            rejected.push(key);
        }
    }

    if (rejected.length > 0) {
        console.warn(`Disallowed fields by user ${userId} on ${table}: ${rejected.join(', ')}`);
    }

    return sanitized;
}


// 2. Update the separateViewData function to preserve user_id when provided
function separateViewData(viewName, data) {
    const config = VIEW_TABLE_MAP[viewName];
    if (!config) return null;

    const result = { relatedTable: config.relatedTable };

    if (config.userTable) {
        result.userTable = config.userTable;
        result.userData = config.userFields.reduce((acc, field) => {
            if (data[field] !== undefined) acc[field] = data[field];
            return acc;
        }, { user_level: config.userLevel });

        result.relatedData = config.relatedFields.reduce((acc, field) => {
            if (data[field] !== undefined) acc[field] = data[field];
            return acc;
        }, {});

        // If user_id is provided in the original data, preserve it
        // This allows admins to create records for specific users
        if (data.user_id !== undefined) {
            result.userData.user_id = data.user_id;
            result.relatedData.user_id = data.user_id;
        }
    } else {
        result.relatedData = config.relatedFields.reduce((acc, field) => {
            if (data[field] !== undefined) acc[field] = data[field];
            return acc;
        }, {});
    }

    return result;
}

async function authenticate(req) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error('User not authenticated');
    if (session.user.level !== 2) throw new Error('Admin access required');
    if (!session.accessToken) throw new Error('Token not valid');
    return session.user.id;
}

function createErrorResponse(message, status) {
    return new Response(JSON.stringify({ error: message }), { status });
}

function createSuccessResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

async function handleRequest(req, operation) {
    try {
        const userId = await authenticate(req);
        const body = await req.json();

        switch (operation) {
            case 'UPDATE': return handleUpdate(body, userId);
            case 'CREATE': return handleCreate(body, userId);
            case 'DELETE': return handleDelete(body, userId);
            default: return createErrorResponse('Invalid operation', 400);
        }
    } catch (error) {
        console.error(`Error processing ${operation}:`, error);
        return createErrorResponse(error.message.includes('not authenticated') ? error.message : 'Internal Server Error',
            error.message.includes('not authenticated') ? 401 :
                error.message.includes('Admin access') ? 403 : 500);
    }
}

async function handleUpdate(body, userId) {
    const { table, id, updates } = body;

    if (!table || id === undefined || !updates || typeof updates !== 'object') {
        return createErrorResponse('Invalid request parameters', 400);
    }

    if (!isValidTable(table)) {
        console.warn(`Invalid table access: ${table} by user ${userId}`);
        return createErrorResponse('Invalid or disallowed table name', 403);
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
        return createErrorResponse('Invalid ID parameter', 400);
    }

    if (Object.keys(updates).length > 50) {
        return createErrorResponse('Too many fields in update request', 400);
    }

    const sanitized = sanitizeData(table, updates, userId);
    if (Object.keys(sanitized).length === 0) {
        return createErrorResponse('No valid fields to update', 400);
    }

    const primaryKey = TABLE_PRIMARY_KEYS[table] || 'id';

    if (!(await checkRecordExists(table, numericId, primaryKey))) {
        return createErrorResponse(`Record with ID ${numericId} not found in ${table}`, 404);
    }

    const duplicate = await checkForDuplicates(table, numericId, sanitized, primaryKey);
    if (duplicate.hasDuplicate) {
        return createErrorResponse(`Cannot update: ${duplicate.field} with value "${duplicate.value}" already exists`, 409);
    }

    const result = await updateTableData(table, numericId, sanitized, primaryKey);
    await logAdminAction(userId, 'UPDATE', table, numericId, sanitized);

    return createSuccessResponse(result);
}

async function handleCreate(body, userId) {
    const { table, data, bulk = false } = body;

    if (!table || !data) {
        return createErrorResponse('Missing table or data parameters', 400);
    }

    if (!isValidTable(table)) {
        console.warn(`Invalid table access: ${table} by user ${userId}`);
        return createErrorResponse('Invalid or disallowed table name', 403);
    }

    return bulk ? handleBulkCreate(table, data, userId) : handleSingleCreate(table, data, userId);
}

async function handleSingleCreate(table, data, userId) {
    if (typeof data !== 'object' || Array.isArray(data)) {
        return createErrorResponse('Data must be an object for single creation', 400);
    }

    if (table.endsWith('_view')) {
        return handleViewInsertion(table, data, userId);
    }

    const primaryKey = TABLE_PRIMARY_KEYS[table] || 'id';
    const cleanData = { ...data };
    delete cleanData[primaryKey];

    const validation = validateRequiredFields(table, cleanData);
    if (!validation.isValid) {
        return createErrorResponse(`Missing required fields: ${validation.missingFields.join(', ')}`, 400);
    }

    console.log(table, cleanData, userId)
    const sanitized = sanitizeData(table, cleanData, userId);
    if (Object.keys(sanitized).length === 0) {
        return createErrorResponse('No valid fields to create', 400);
    }

    try {
        const result = await createRecord(table, sanitized);
        await logAdminAction(userId, 'CREATE', table, result.insertId, sanitized);

        return createSuccessResponse({
            success: true,
            message: `Created new record in ${table}`,
            insertId: result.insertId,
            affectedRows: result.affectedRows
        }, 201);
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            return createErrorResponse('Cannot create record: duplicate value for unique field', 409);
        }
        throw error;
    }
}

async function handleViewInsertion(viewName, data, userId) {
    console.log(viewName, data, userId)
    const tableInfo = separateViewData(viewName, data);
    if (!tableInfo) {
        return createErrorResponse('Unsupported view for insertion', 400);
    }

    try {
        let insertId;
        let totalAffected = 0;

        if (tableInfo.userTable && tableInfo.userData) {
            const userResult = await createRecord(tableInfo.userTable, tableInfo.userData);
            insertId = userResult.insertId;
            totalAffected += userResult.affectedRows;

            if (tableInfo.relatedTable && tableInfo.relatedData) {
                if (!tableInfo.relatedData.user_id) {
                    tableInfo.relatedData.user_id = insertId;
                }
                const relatedResult = await createRecord(tableInfo.relatedTable, tableInfo.relatedData);
                totalAffected += relatedResult.affectedRows;
            }
        } else if (tableInfo.relatedTable && tableInfo.relatedData) {
            const result = await createRecord(tableInfo.relatedTable, tableInfo.relatedData);
            insertId = result.insertId;
            totalAffected = result.affectedRows;
        }

        await logAdminAction(userId, 'CREATE', viewName, insertId, data);

        return createSuccessResponse({
            success: true,
            message: `Created new record in ${viewName}`,
            insertId,
            affectedRows: totalAffected
        }, 201);
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            return createErrorResponse('Cannot create record: duplicate value for unique field', 409);
        }
        throw error;
    }
}

async function handleBulkCreate(table, dataArray, userId) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return createErrorResponse('Data must be a non-empty array for bulk creation', 400);
    }

    if (dataArray.length > 100) {
        return createErrorResponse('Maximum 100 records allowed in bulk creation', 400);
    }

    if (table.endsWith('_view')) {
        return handleBulkViewInsertion(table, dataArray, userId);
    }

    const primaryKey = TABLE_PRIMARY_KEYS[table] || 'id';
    const sanitized = [];
    const errors = [];

    for (let i = 0; i < dataArray.length; i++) {
        const record = dataArray[i];

        if (typeof record !== 'object' || Array.isArray(record)) {
            errors.push(`Record ${i + 1}: Must be an object`);
            continue;
        }

        const cleanRecord = { ...record };
        delete cleanRecord[primaryKey];

        const validation = validateRequiredFields(table, cleanRecord);
        if (!validation.isValid) {
            errors.push(`Record ${i + 1}: Missing required fields: ${validation.missingFields.join(', ')}`);
            continue;
        }

        try {
            const sanitizedData = sanitizeData(table, cleanRecord, userId);
            if (Object.keys(sanitizedData).length > 0) {
                sanitized.push(sanitizedData);
            }
        } catch (error) {
            errors.push(`Record ${i + 1}: ${error.message}`);
        }
    }

    if (errors.length > 0) {
        return createErrorResponse('Validation errors in bulk data', 400, { details: errors });
    }

    try {
        const result = await createBulkRecords(table, sanitized);
        await logAdminAction(userId, 'BULK_CREATE', table, null, { count: sanitized.length });

        return createSuccessResponse({
            success: true,
            message: `Created ${result.affectedRows} records in ${table}`,
            affectedRows: result.affectedRows
        }, 201);
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            return createErrorResponse('Cannot create records: duplicate value(s) for unique field(s)', 409);
        }
        throw error;
    }
}

async function handleBulkViewInsertion(viewName, dataArray, userId) {
    const results = [];
    const errors = [];

    for (let i = 0; i < dataArray.length; i++) {
        try {
            const tableInfo = separateViewData(viewName, dataArray[i]);
            if (!tableInfo) {
                errors.push(`Record ${i + 1}: Unsupported view for insertion`);
                continue;
            }

            let insertId;
            if (tableInfo.userTable && tableInfo.userData) {
                // FIXED: Check if user_id is already provided
                if (tableInfo.userData.user_id) {
                    // User ID is specified, use it directly
                    insertId = tableInfo.userData.user_id;
                    
                    // Create or update user record
                    const userResult = await createRecord(tableInfo.userTable, tableInfo.userData);
                    
                    // Handle case where user_id was provided but user doesn't exist
                    if (!userResult.insertId) {
                        insertId = tableInfo.userData.user_id;
                    } else {
                        insertId = userResult.insertId;
                    }
                } else {
                    // No user ID specified, create new user
                    const userResult = await createRecord(tableInfo.userTable, tableInfo.userData);
                    insertId = userResult.insertId;
                }

                if (tableInfo.relatedTable && tableInfo.relatedData) {
                    if (!tableInfo.relatedData.user_id) {
                        tableInfo.relatedData.user_id = insertId;
                    }
                    await createRecord(tableInfo.relatedTable, tableInfo.relatedData);
                }
            } else if (tableInfo.relatedTable && tableInfo.relatedData) {
                const result = await createRecord(tableInfo.relatedTable, tableInfo.relatedData);
                insertId = result.insertId;
            }

            results.push({ insertId });
        } catch (error) {
            errors.push(`Record ${i + 1}: ${error.message}`);
        }
    }

    if (errors.length > 0 && results.length === 0) {
        return createErrorResponse('All records failed to create', 400, { details: errors });
    }

    await logAdminAction(userId, 'BULK_CREATE', viewName, null, {
        count: results.length,
        errors: errors.length
    });

    return createSuccessResponse({
        success: true,
        message: `Created ${results.length} records in ${viewName}`,
        affectedRows: results.length,
        errors: errors.length > 0 ? errors : undefined
    }, 201);
}

async function handleDelete(body, userId) {
    const { table, id } = body;

    if (!table || id === undefined) {
        return createErrorResponse('Missing table or id parameters', 400);
    }

    if (!isValidTable(table)) {
        console.warn(`Invalid table access: ${table} by user ${userId}`);
        return createErrorResponse('Invalid or disallowed table name', 403);
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
        return createErrorResponse('Invalid ID parameter', 400);
    }

    if (table.endsWith('_view')) {
        return handleViewDeletion(table, numericId, userId);
    }

    const primaryKey = TABLE_PRIMARY_KEYS[table] || 'id';

    if (!(await checkRecordExists(table, numericId, primaryKey))) {
        return createErrorResponse(`Record with ID ${numericId} not found in ${table}`, 404);
    }

    try {
        // Use stored procedures for safe deletion when available
        let result;
        if (table === 'users' && await isTeacher(numericId)) {
            result = await executeQueryWithRetry({
                query: 'CALL DeleteTeacher(?)',
                values: [numericId]
            });
        } else if (table === 'classes') {
            result = await executeQueryWithRetry({
                query: 'CALL DeleteClass(?)',
                values: [numericId]
            });
        } else {
            // Standard delete for other tables (foreign keys will handle cascading)
            result = await deleteRecord(table, numericId, primaryKey);
        }

        await logAdminAction(userId, 'DELETE', table, numericId, {});

        return createSuccessResponse({
            success: true,
            message: `Deleted record from ${table}`,
            affectedRows: result.affectedRows || 1
        });
    } catch (error) {
        if (error.message.includes('foreign key constraint')) {
            return createErrorResponse('Cannot delete record: it is referenced by other records', 409);
        }
        throw error;
    }
}

// SIMPLIFIED: View deletion now relies on database cascading
async function handleViewDeletion(viewName, id, userId) {
    const config = VIEW_TABLE_MAP[viewName];
    if (!config) {
        return createErrorResponse('Unsupported view for deletion', 400);
    }

    try {
        let result;

        if (config.userTable) {
            // Delete from users table - foreign keys will cascade to related tables
            result = await deleteRecord(config.userTable, id, 'user_id');
        } else {
            const primaryKey = viewName === 'classes_view' ? 'class_id' : 'id';
            // Use stored procedure for class deletion if available
            if (viewName === 'classes_view') {
                result = await executeQueryWithRetry({
                    query: 'CALL DeleteClass(?)',
                    values: [id]
                });
            } else {
                result = await deleteRecord(config.relatedTable, id, primaryKey);
            }
        }

        await logAdminAction(userId, 'DELETE', viewName, id, {});

        return createSuccessResponse({
            success: true,
            message: `Deleted record from ${viewName}`,
            affectedRows: result.affectedRows || 1
        });
    } catch (error) {
        if (error.message.includes('foreign key constraint')) {
            return createErrorResponse('Cannot delete record: it is referenced by other records', 409);
        }
        throw error;
    }
}

// Helper function to check if user is a teacher
async function isTeacher(userId) {
    try {
        const result = await executeQueryWithRetry({
            query: 'SELECT 1 FROM teachers WHERE user_id = ? LIMIT 1',
            values: [userId]
        });
        return result.length > 0;
    } catch (err) {
        return false;
    }
}

// Database operations
async function checkRecordExists(table, id, primaryKey) {
    try {
        const result = await executeQueryWithRetry({
            query: `SELECT 1 FROM \`${table}\` WHERE \`${primaryKey}\` = ? LIMIT 1`,
            values: [id],
        });
        return result.length > 0;
    } catch (err) {
        throw new Error(`Record check failed: ${err.message}`);
    }
}

async function checkForDuplicates(table, id, updates, primaryKey) {
    try {
        const tableInfo = await executeQueryWithRetry({
            query: `SHOW INDEXES FROM \`${table}\` WHERE Non_unique = 0 AND Key_name != 'PRIMARY'`,
            values: [],
        });

        const uniqueColumns = tableInfo.map(index => index.Column_name).filter(Boolean);

        for (const [field, value] of Object.entries(updates)) {
            if (!value || !uniqueColumns.includes(field)) continue;

            const checkResult = await executeQueryWithRetry({
                query: `SELECT COUNT(*) as count FROM \`${table}\` WHERE \`${field}\` = ? AND \`${primaryKey}\` != ?`,
                values: [value, id],
            });

            if (checkResult[0].count > 0) {
                return { hasDuplicate: true, field, value };
            }
        }

        return { hasDuplicate: false };
    } catch (err) {
        throw new Error(`Duplicate check failed: ${err.message}`);
    }
}

async function updateTableData(table, id, updates, primaryKey) {
    try {
        const updateFields = Object.keys(updates).map(key => `\`${key}\` = ?`).join(', ');
        const values = [...Object.values(updates), id];

        const result = await executeQueryWithRetry({
            query: `UPDATE \`${table}\` SET ${updateFields} WHERE \`${primaryKey}\` = ?`,
            values,
        });

        return {
            success: true,
            message: `Updated ${result.affectedRows} row(s) in ${table}`,
            affectedRows: result.affectedRows
        };
    } catch (err) {
        throw new Error(`Database operation failed: ${err.message}`);
    }
}

async function createRecord(table, data) {
    try {
        const fields = Object.keys(data).map(key => `\`${key}\``).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');

        const result = await executeQueryWithRetry({
            query: `INSERT INTO \`${table}\` (${fields}) VALUES (${placeholders})`,
            values: Object.values(data),
        });

        return result;
    } catch (err) {
        throw new Error(`Database operation failed: ${err.message}`);
    }
}

async function createBulkRecords(table, records) {
    try {
        if (records.length === 0) return { affectedRows: 0 };

        const allFields = [...new Set(records.flatMap(record => Object.keys(record)))];
        const fields = allFields.map(key => `\`${key}\``).join(', ');
        const placeholderRows = records.map(() => `(${allFields.map(() => '?').join(', ')})`).join(', ');
        const values = records.flatMap(record => allFields.map(field => record[field] || null));

        const result = await executeQueryWithRetry({
            query: `INSERT INTO \`${table}\` (${fields}) VALUES ${placeholderRows}`,
            values,
        });

        return result;
    } catch (err) {
        throw new Error(`Database operation failed: ${err.message}`);
    }
}

async function deleteRecord(table, id, primaryKey) {
    try {
        const result = await executeQueryWithRetry({
            query: `DELETE FROM \`${table}\` WHERE \`${primaryKey}\` = ?`,
            values: [id],
        });

        return result;
    } catch (err) {
        throw new Error(`Database operation failed: ${err.message}`);
    }
}

async function logAdminAction(adminId, actionType, table, recordId, details) {
    try {
        const actionDetails = JSON.stringify({ table, recordId, changes: details });
        await executeQueryWithRetry({
            query: `INSERT INTO admin_audit_logs (admin_id, action_type, action_details, timestamp) VALUES (?, ?, ?, NOW())`,
            values: [adminId, actionType, actionDetails],
        });
    } catch (err) {
        console.error('Failed to log admin action:', err);
    }
}

// Export handlers
export async function PUT(req) { return handleRequest(req, 'UPDATE'); }
export async function POST(req) { return handleRequest(req, 'CREATE'); }
export async function DELETE(req) { return handleRequest(req, 'DELETE') };
