import { getServerSession } from "next-auth";
import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";

// Define allowed tables explicitly - now includes underlying tables
const ALLOWED_TABLES = [
    'users',
    'teachers',
    'students', 
    'classes',
    'pending_teachers',
    'classes_view',
    'students_view',
    'teachers_view',
];

const DISALLOWED_FIELDS = {
    'users': ['user_passkey'],
    'pending_teachers': ['user_passkey'],
};

// Map of table names to their primary key column names
const TABLE_PRIMARY_KEYS = {
    'classes_view': 'class_id',
    'students_view': 'user_id',
    'teachers_view': 'user_id',
    'users': 'user_id',
    'teachers': 'user_id',
    'students': 'user_id',
    'classes': 'class_id',
    'pending_teachers': 'pending_id',
};

// Required fields for each table when creating new records (excluding auto-generated IDs)
const REQUIRED_FIELDS = {
    'classes': ['course_id', 'teacher_id', 'grade_id', 'start_time', 'end_time'],
    'students': [], // user_id will be auto-generated or handled separately
    'teachers': [], // user_id will be auto-generated or handled separately
    'users': ['user_name', 'user_email'],
    'pending_teachers': ['user_name', 'user_email'],
};

const DEFAULT_PRIMARY_KEY = 'id';

// Validation function to prevent SQL injection and ensure field safety
function validateField(table, field) {
    if (!/^[a-zA-Z0-9_]+$/.test(field)) {
        return false;
    }

    if (DISALLOWED_FIELDS[table] && DISALLOWED_FIELDS[table].includes(field)) {
        return false;
    }

    return true;
}

// Validate table name against SQL injection patterns and ensure it's allowed
function isValidTable(tableName) {
    if (!/^[a-zA-Z0-9_\-.$]+$/.test(tableName)) {
        return false;
    }
    return ALLOWED_TABLES.includes(tableName);
}

// Check if required fields are present for creation
function validateRequiredFields(table, data) {
    const required = REQUIRED_FIELDS[table] || [];
    const missing = required.filter(field =>
        data[field] === undefined || data[field] === null || data[field] === ''
    );

    return {
        isValid: missing.length === 0,
        missingFields: missing
    };
}

// Helper function to separate data for view insertions
function separateDataForTables(viewName, data) {
    switch (viewName) {
        case 'teachers_view':
            const teacherUserData = {
                user_name: data.user_name,
                user_email: data.user_email,
                user_level: 1, // Teachers have level 1
                contact: data.contact,
                address: data.address
            };
            const teacherData = {
                experience: data.experience,
                qualification: data.qualification
            };
            return { userTable: 'users', userData: teacherUserData, relatedTable: 'teachers', relatedData: teacherData };

        case 'students_view':
            const studentUserData = {
                user_name: data.user_name,
                user_email: data.user_email,
                user_level: 0, // Students have level 0
                contact: data.contact,
                address: data.address
            };
            const studentData = {
                guardian_name: data.guardian_name,
                guardian_relation: data.guardian_relation,
                guardian_contact: data.guardian_contact,
                school: data.school,
                date_of_birth: data.date_of_birth,
                class: data.class
            };
            return { userTable: 'users', userData: studentUserData, relatedTable: 'students', relatedData: studentData };

        case 'classes_view':
            // For classes, we only need to insert into the classes table
            const classData = {
                course_id: data.course_id,
                teacher_id: data.teacher_id,
                grade_id: data.grade_id,
                start_time: data.start_time,
                end_time: data.end_time,
                class_description: data.class_description
            };
            return { userTable: null, userData: null, relatedTable: 'classes', relatedData: classData };

        default:
            return null;
    }
}

// Main handler for all CRUD operations
export async function PUT(req) {
    return handleRequest(req, 'UPDATE');
}

export async function POST(req) {
    return handleRequest(req, 'CREATE');
}

export async function DELETE(req) {
    return handleRequest(req, 'DELETE');
}

async function handleRequest(req, operation) {
    try {
        // Authentication check
        const session = await getServerSession(authOptions);
        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
        }

        const userId = session.user.id;
        const userLevel = session.user.level;

        if (userLevel !== 2) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403 });
        }

        if (!session.accessToken) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Token not valid' }), { status: 401 });
        }

        // Parse request body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400 });
        }
        // Route to appropriate handler based on operation
        switch (operation) {
            case 'UPDATE':
                return handleUpdate(body, userId);
            case 'CREATE':
                return handleCreate(body, userId);
            case 'DELETE':
                return handleDelete(body, userId);
            default:
                return new Response(JSON.stringify({ error: 'Invalid operation' }), { status: 400 });
        }
    } catch (error) {
        console.error(`Error processing ${operation} request:`, error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}

// Handle UPDATE operations
async function handleUpdate(body, userId) {
    const { table, id, updates } = body;

    if (!table || id === undefined || !updates || typeof updates !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid request parameters' }), { status: 400 });
    }

    if (!isValidTable(table)) {
        console.warn(`Invalid table access attempt: ${table} by user ${userId}`);
        return new Response(JSON.stringify({ error: 'Invalid or disallowed table name' }), { status: 403 });
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid ID parameter' }), { status: 400 });
    }

    if (Object.keys(updates).length > 50) {
        return new Response(JSON.stringify({ error: 'Too many fields in update request' }), { status: 400 });
    }

    const sanitizedUpdates = {};
    const rejectedFields = [];

    for (const [key, value] of Object.entries(updates)) {
        if (validateField(table, key)) {
            if (typeof value === 'string' && value.length > 5000) {
                return new Response(JSON.stringify({ error: `Field value too large for ${key}` }), { status: 400 });
            }
            sanitizedUpdates[key] = value;
        } else {
            rejectedFields.push(key);
        }
    }

    if (rejectedFields.length > 0) {
        console.warn(`Disallowed field update attempt by user ${userId} on table ${table}: ${rejectedFields.join(', ')}`);
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
        return new Response(JSON.stringify({ error: 'No valid fields to update' }), { status: 400 });
    }

    const primaryKeyColumn = TABLE_PRIMARY_KEYS[table] || DEFAULT_PRIMARY_KEY;

    const recordExists = await checkRecordExists(table, numericId, primaryKeyColumn);
    if (!recordExists) {
        return new Response(JSON.stringify({
            error: `Record with ID ${numericId} not found in ${table}`
        }), { status: 404 });
    }

    const duplicateCheck = await checkForDuplicates(table, numericId, sanitizedUpdates, primaryKeyColumn);
    if (duplicateCheck.hasDuplicate) {
        return new Response(JSON.stringify({
            error: `Cannot update: ${duplicateCheck.field} with value "${duplicateCheck.value}" already exists in the table`
        }), { status: 409 });
    }
    const response = await updateTableData(table, numericId, sanitizedUpdates, primaryKeyColumn);
    await logAdminAction(userId, 'UPDATE', table, numericId, sanitizedUpdates);

    return new Response(JSON.stringify(response), { status: 200 });
}

// Handle CREATE operations (single and bulk)
async function handleCreate(body, userId) {
    const { table, data, bulk = false } = body;

    if (!table || !data) {
        return new Response(JSON.stringify({ error: 'Missing table or data parameters' }), { status: 400 });
    }

    if (!isValidTable(table)) {
        console.warn(`Invalid table access attempt: ${table} by user ${userId}`);
        return new Response(JSON.stringify({ error: 'Invalid or disallowed table name' }), { status: 403 });
    }

    if (bulk) {
        return handleBulkCreate(table, data, userId);
    } else {
        return handleSingleCreate(table, data, userId);
    }
}

// Handle single record creation
async function handleSingleCreate(table, data, userId) {
    if (typeof data !== 'object' || Array.isArray(data)) {
        return new Response(JSON.stringify({ error: 'Data must be an object for single creation' }), { status: 400 });
    }
    
    // Check if this is a view that needs special handling
    if (table.endsWith('_view')) {
        return handleViewInsertion(table, data, userId);
    }

    // Remove primary key from data if it exists (let database auto-generate)
    const primaryKeyColumn = TABLE_PRIMARY_KEYS[table] || DEFAULT_PRIMARY_KEY;
    const cleanData = { ...data };
    delete cleanData[primaryKeyColumn];

    const validation = validateRequiredFields(table, cleanData);
    if (!validation.isValid) {
        return new Response(JSON.stringify({
            error: `Missing required fields: ${validation.missingFields.join(', ')}`
        }), { status: 400 });
    }

    const sanitizedData = {};
    const rejectedFields = [];

    for (const [key, value] of Object.entries(cleanData)) {
        if (validateField(table, key)) {
            if (typeof value === 'string' && value.length > 5000) {
                return new Response(JSON.stringify({ error: `Field value too large for ${key}` }), { status: 400 });
            }
            sanitizedData[key] = value;
        } else {
            rejectedFields.push(key);
        }
    }

    if (rejectedFields.length > 0) {
        console.warn(`Disallowed field create attempt by user ${userId} on table ${table}: ${rejectedFields.join(', ')}`);
    }

    if (Object.keys(sanitizedData).length === 0) {
        return new Response(JSON.stringify({ error: 'No valid fields to create' }), { status: 400 });
    }

    try {
        const result = await createRecord(table, sanitizedData);
        await logAdminAction(userId, 'CREATE', table, result.insertId, sanitizedData);

        return new Response(JSON.stringify({
            success: true,
            message: `Created new record in ${table}`,
            insertId: result.insertId,
            affectedRows: result.affectedRows
        }), { status: 201 });
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            return new Response(JSON.stringify({
                error: 'Cannot create record: duplicate value for unique field'
            }), { status: 409 });
        }
        throw error;
    }
}

// Handle view insertions (insert into underlying tables)
async function handleViewInsertion(viewName, data, userId) {
    const tableInfo = separateDataForTables(viewName, data);
    
    if (!tableInfo) {
        return new Response(JSON.stringify({ error: 'Unsupported view for insertion' }), { status: 400 });
    }

    try {
        if (tableInfo.userTable && tableInfo.userData) {
            // First insert into users table
            const userResult = await createRecord(tableInfo.userTable, tableInfo.userData);
            const userId = userResult.insertId;

            // Then insert into related table with the user_id
            if (tableInfo.relatedTable && tableInfo.relatedData) {
                tableInfo.relatedData.user_id = userId;
                const relatedResult = await createRecord(tableInfo.relatedTable, tableInfo.relatedData);
                
                await logAdminAction(userId, 'CREATE', viewName, userId, data);
                
                return new Response(JSON.stringify({
                    success: true,
                    message: `Created new record in ${viewName}`,
                    insertId: userId,
                    affectedRows: userResult.affectedRows + relatedResult.affectedRows
                }), { status: 201 });
            }
        } else if (tableInfo.relatedTable && tableInfo.relatedData) {
            // For classes_view, only insert into classes table
            const result = await createRecord(tableInfo.relatedTable, tableInfo.relatedData);
            
            await logAdminAction(userId, 'CREATE', viewName, result.insertId, data);
            
            return new Response(JSON.stringify({
                success: true,
                message: `Created new record in ${viewName}`,
                insertId: result.insertId,
                affectedRows: result.affectedRows
            }), { status: 201 });
        }
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            return new Response(JSON.stringify({
                error: 'Cannot create record: duplicate value for unique field'
            }), { status: 409 });
        }
        throw error;
    }
}

// Handle bulk record creation
async function handleBulkCreate(table, dataArray, userId) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return new Response(JSON.stringify({ error: 'Data must be a non-empty array for bulk creation' }), { status: 400 });
    }

    if (dataArray.length > 100) {
        return new Response(JSON.stringify({ error: 'Maximum 100 records allowed in bulk creation' }), { status: 400 });
    }

    // Check if this is a view that needs special handling
    if (table.endsWith('_view')) {
        return handleBulkViewInsertion(table, dataArray, userId);
    }

    const primaryKeyColumn = TABLE_PRIMARY_KEYS[table] || DEFAULT_PRIMARY_KEY;
    const sanitizedRecords = [];
    const errors = [];

    for (let i = 0; i < dataArray.length; i++) {
        const record = dataArray[i];

        if (typeof record !== 'object' || Array.isArray(record)) {
            errors.push(`Record ${i + 1}: Must be an object`);
            continue;
        }

        // Remove primary key from record if it exists (let database auto-generate)
        const cleanRecord = { ...record };
        delete cleanRecord[primaryKeyColumn];

        const validation = validateRequiredFields(table, cleanRecord);
        if (!validation.isValid) {
            errors.push(`Record ${i + 1}: Missing required fields: ${validation.missingFields.join(', ')}`);
            continue;
        }

        const sanitizedData = {};
        let hasError = false;

        for (const [key, value] of Object.entries(cleanRecord)) {
            if (validateField(table, key)) {
                if (typeof value === 'string' && value.length > 5000) {
                    errors.push(`Record ${i + 1}: Field value too large for ${key}`);
                    hasError = true;
                    break;
                }
                sanitizedData[key] = value;
            }
        }

        if (!hasError && Object.keys(sanitizedData).length > 0) {
            sanitizedRecords.push(sanitizedData);
        }
    }

    if (errors.length > 0) {
        return new Response(JSON.stringify({
            error: 'Validation errors in bulk data',
            details: errors
        }), { status: 400 });
    }

    try {
        const result = await createBulkRecords(table, sanitizedRecords);
        await logAdminAction(userId, 'BULK_CREATE', table, null, { count: sanitizedRecords.length });

        return new Response(JSON.stringify({
            success: true,
            message: `Created ${result.affectedRows} records in ${table}`,
            affectedRows: result.affectedRows
        }), { status: 201 });
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            return new Response(JSON.stringify({
                error: 'Cannot create records: duplicate value(s) for unique field(s)'
            }), { status: 409 });
        }
        throw error;
    }
}

// Handle bulk view insertions
async function handleBulkViewInsertion(viewName, dataArray, userId) {
    const results = [];
    const errors = [];

    for (let i = 0; i < dataArray.length; i++) {
        try {
            const tableInfo = separateDataForTables(viewName, dataArray[i]);
            
            if (!tableInfo) {
                errors.push(`Record ${i + 1}: Unsupported view for insertion`);
                continue;
            }

            if (tableInfo.userTable && tableInfo.userData) {
                // First insert into users table
                const userResult = await createRecord(tableInfo.userTable, tableInfo.userData);
                const newUserId = userResult.insertId;

                // Then insert into related table with the user_id
                if (tableInfo.relatedTable && tableInfo.relatedData) {
                    tableInfo.relatedData.user_id = newUserId;
                    await createRecord(tableInfo.relatedTable, tableInfo.relatedData);
                }
                
                results.push({ insertId: newUserId });
            } else if (tableInfo.relatedTable && tableInfo.relatedData) {
                // For classes_view, only insert into classes table
                const result = await createRecord(tableInfo.relatedTable, tableInfo.relatedData);
                results.push({ insertId: result.insertId });
            }
        } catch (error) {
            errors.push(`Record ${i + 1}: ${error.message}`);
        }
    }

    if (errors.length > 0 && results.length === 0) {
        return new Response(JSON.stringify({
            error: 'All records failed to create',
            details: errors
        }), { status: 400 });
    }

    await logAdminAction(userId, 'BULK_CREATE', viewName, null, { 
        count: results.length, 
        errors: errors.length 
    });

    return new Response(JSON.stringify({
        success: true,
        message: `Created ${results.length} records in ${viewName}`,
        affectedRows: results.length,
        errors: errors.length > 0 ? errors : undefined
    }), { status: 201 });
}

// Handle DELETE operations
async function handleDelete(body, userId) {
    const { table, id } = body;

    if (!table || id === undefined) {
        return new Response(JSON.stringify({ error: 'Missing table or id parameters' }), { status: 400 });
    }

    if (!isValidTable(table)) {
        console.warn(`Invalid table access attempt: ${table} by user ${userId}`);
        return new Response(JSON.stringify({ error: 'Invalid or disallowed table name' }), { status: 403 });
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid ID parameter' }), { status: 400 });
    }

    // Handle view deletions
    if (table.endsWith('_view')) {
        return handleViewDeletion(table, numericId, userId);
    }

    const primaryKeyColumn = TABLE_PRIMARY_KEYS[table] || DEFAULT_PRIMARY_KEY;

    const recordExists = await checkRecordExists(table, numericId, primaryKeyColumn);
    if (!recordExists) {
        return new Response(JSON.stringify({
            error: `Record with ID ${numericId} not found in ${table}`
        }), { status: 404 });
    }

    try {
        const result = await deleteRecord(table, numericId, primaryKeyColumn);
        await logAdminAction(userId, 'DELETE', table, numericId, {});

        return new Response(JSON.stringify({
            success: true,
            message: `Deleted record from ${table}`,
            affectedRows: result.affectedRows
        }), { status: 200 });
    } catch (error) {
        if (error.message.includes('foreign key constraint')) {
            return new Response(JSON.stringify({
                error: 'Cannot delete record: it is referenced by other records'
            }), { status: 409 });
        }
        throw error;
    }
}

// Handle view deletions (delete from underlying tables)
async function handleViewDeletion(viewName, id, userId) {
    try {
        let result;
        
        switch (viewName) {
            case 'teachers_view':
            case 'students_view':
                // For teacher and student views, delete from both related table and users table
                const relatedTable = viewName === 'teachers_view' ? 'teachers' : 'students';
                
                // Delete from related table first (due to foreign key constraints)
                await deleteRecord(relatedTable, id, 'user_id');
                // Then delete from users table
                result = await deleteRecord('users', id, 'user_id');
                break;
                
            case 'classes_view':
                // For classes view, only delete from classes table
                result = await deleteRecord('classes', id, 'class_id');
                break;
                
            default:
                throw new Error('Unsupported view for deletion');
        }

        await logAdminAction(userId, 'DELETE', viewName, id, {});

        return new Response(JSON.stringify({
            success: true,
            message: `Deleted record from ${viewName}`,
            affectedRows: result.affectedRows
        }), { status: 200 });
    } catch (error) {
        if (error.message.includes('foreign key constraint')) {
            return new Response(JSON.stringify({
                error: 'Cannot delete record: it is referenced by other records'
            }), { status: 409 });
        }
        throw error;
    }
}

// Database operation functions
async function checkRecordExists(table, id, primaryKeyColumn) {
    try {
        const result = await executeQueryWithRetry({
            query: `SELECT 1 FROM \`${table}\` WHERE \`${primaryKeyColumn}\` = ? LIMIT 1`,
            values: [id],
        });
        return result.length > 0;
    } catch (err) {
        console.error('Record existence check failed:', err);
        throw new Error(`Record check failed: ${err.message}`);
    }
}

async function checkForDuplicates(table, id, updates, primaryKeyColumn) {
    const result = { hasDuplicate: false, field: null, value: null };

    try {
        const tableInfo = await executeQueryWithRetry({
            query: `SHOW INDEXES FROM \`${table}\` WHERE Non_unique = 0 AND Key_name != 'PRIMARY'`,
            values: [],
        });

        const uniqueColumns = tableInfo
            .filter(index => index.Column_name)
            .map(index => index.Column_name);

        for (const field of Object.keys(updates)) {
            const value = updates[field];

            if (value === null || value === '' || !uniqueColumns.includes(field)) continue;

            const checkResult = await executeQueryWithRetry({
                query: `SELECT COUNT(*) as count FROM \`${table}\` 
                WHERE \`${field}\` = ? 
                AND \`${primaryKeyColumn}\` != ?`,
                values: [value, id],
            });

            if (checkResult[0].count > 0) {
                result.hasDuplicate = true;
                result.field = field;
                result.value = value;
                break;
            }
        }

        return result;
    } catch (err) {
        console.error('Duplicate check failed:', err);
        throw new Error(`Duplicate check failed: ${err.message}`);
    }
}

async function updateTableData(table, id, updates, primaryKeyColumn) {
    try {
        const updateFields = Object.keys(updates).map(key => `\`${key}\` = ?`).join(', ');
        const updateValues = Object.values(updates);
        const values = [...updateValues, id];

        const result = await executeQueryWithRetry({
            query: `UPDATE \`${table}\` SET ${updateFields} WHERE \`${primaryKeyColumn}\` = ?`,
            values: values,
        });

        return {
            success: true,
            message: `Updated ${result.affectedRows} row(s) in ${table}`,
            affectedRows: result.affectedRows
        };
    } catch (err) {
        console.error('Database update failed:', err);
        throw new Error(`Database operation failed: ${err.message}`);
    }
}

async function createRecord(table, data) {
    try {
        const fields = Object.keys(data).map(key => `\`${key}\``).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);
        
        const result = await executeQueryWithRetry({
            query: `INSERT INTO \`${table}\` (${fields}) VALUES (${placeholders})`,
            values: values,
        });

        return result;
    } catch (err) {
        console.error('Database create failed:', err);
        throw new Error(`Database operation failed: ${err.message}`);
    }
}

async function createBulkRecords(table, records) {
    try {
        if (records.length === 0) return { affectedRows: 0 };

        // Get all unique field names from all records
        const allFields = [...new Set(records.flatMap(record => Object.keys(record)))];
        const fields = allFields.map(key => `\`${key}\``).join(', ');

        // Create placeholders for each record
        const placeholderRows = records.map(() =>
            `(${allFields.map(() => '?').join(', ')})`
        ).join(', ');

        // Create values array ensuring consistent field order
        const values = records.flatMap(record =>
            allFields.map(field => record[field] || null)
        );

        const result = await executeQueryWithRetry({
            query: `INSERT INTO \`${table}\` (${fields}) VALUES ${placeholderRows}`,
            values: values,
        });

        return result;
    } catch (err) {
        console.error('Database bulk create failed:', err);
        throw new Error(`Database operation failed: ${err.message}`);
    }
}

async function deleteRecord(table, id, primaryKeyColumn) {
    try {
        const result = await executeQueryWithRetry({
            query: `DELETE FROM \`${table}\` WHERE \`${primaryKeyColumn}\` = ?`,
            values: [id],
        });

        return result;
    } catch (err) {
        console.error('Database delete failed:', err);
        throw new Error(`Database operation failed: ${err.message}`);
    }
}

async function logAdminAction(adminId, actionType, table, recordId, details) {
    try {
        const actionDetails = JSON.stringify({
            table: table,
            recordId: recordId,
            changes: details
        });

        await executeQueryWithRetry({
            query: `INSERT INTO admin_audit_logs (admin_id, action_type, action_details, timestamp) 
              VALUES (?, ?, ?, NOW())`,
            values: [adminId, actionType, actionDetails],
        });
    } catch (err) {
        console.error('Failed to log admin action:', err);
    }
}
