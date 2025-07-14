// /api/schema/route.js
import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getServerSession } from 'next-auth/next';

const allowedTables = [
    'grades', 'classes', 'courses', 'classes_users', 'notices',
    'users', 'pending_teachers', 'teachers', 'students', 'class_joining_pending'
];

export async function GET(req) {
    try {
        const tableName = getTableName(req);
        const session = await getServerSession(authOptions);
        
        if (tableName) {
            validateTableName(tableName);
            await validateAccess(session);
            const schema = await fetchTableSchema(tableName);
            return createResponse(schema);
        }
        
        // Fetch all schemas
        await validateAccess(session);
        const schemas = await fetchAllSchemas();
        return createResponse(schemas);
        
    } catch (error) {
        return handleError(error);
    }
}

function getTableName(req) {
    const { searchParams } = new URL(req.url);
    return searchParams.get('table');
}

function validateTableName(tableName) {
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new ValidationError('Invalid table name');
    }
    if (!allowedTables.includes(tableName)) {
        throw new AccessError('Table access not permitted');
    }
}

async function validateAccess(session) {
    if (!session) {
        throw new AuthError('Unauthorized access');
    }
}

async function fetchTableSchema(tableName) {
    const columns = await getTableColumns(tableName);
    const sampleData = await getSampleData(tableName);
    
    return {
        tableName,
        columns,
        idField: getIdFieldForTable(tableName),
        stateKey: getStateKeyForTable(tableName),
        fetchedAt: Date.now()
    };
}

async function fetchAllSchemas() {
    const schemas = {};
    
    const results = await Promise.allSettled(
        allowedTables.map(async (tableName) => ({
            name: tableName,
            schema: await fetchTableSchema(tableName)
        }))
    );
    
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            schemas[result.value.name] = result.value.schema;
        } else {
            console.error(`Schema fetch failed for ${result.value?.name}:`, result.reason);
        }
    });
    
    return schemas;
}

async function getTableColumns(tableName) {
    const query = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = ? 
        ORDER BY ORDINAL_POSITION
    `;
    
    const result = await executeQuery(query, [tableName]);
    return result.map(row => row.COLUMN_NAME);
}

async function getSampleData(tableName) {
    const query = `SELECT * FROM ${tableName} LIMIT 1`;
    const result = await executeQuery(query);
    return result.length > 0 ? Object.keys(result[0]) : [];
}

function getIdFieldForTable(tableName) {
    const idFields = {
        classes: 'class_id',
        users: 'user_id',
        students: 'student_id',
        teachers: 'teacher_id',
        courses: 'course_id',
        grades: 'grade_id'
    };
    return idFields[tableName] || 'id';
}

function getStateKeyForTable(tableName) {
    const stateKeys = {
        classes: 'classesData',
        users: 'usersData',
        students: 'studentsData',
        teachers: 'teachersData',
        courses: 'courseData',
        grades: 'gradesData'
    };
    return stateKeys[tableName];
}

async function executeQuery(query, values = []) {
    try {
        return await executeQueryWithRetry({ query, values });
    } catch (error) {
        console.error('Database query failed:', error);
        throw new DatabaseError(error.message);
    }
}

function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

function handleError(error) {
    console.error('Schema API Error:', error);
    const errorMap = {
        ValidationError: 400,
        AccessError: 403,
        AuthError: 401,
        DatabaseError: 500
    };
    const status = errorMap[error.constructor.name] || 500;
    return createResponse({ error: error.message }, status);
}

// Custom error classes
class ValidationError extends Error { }
class AccessError extends Error { }
class AuthError extends Error { }
class DatabaseError extends Error { }
