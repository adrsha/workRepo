const publicTables = ['grades', 'classes', 'courses', 'classes_users', 'notices', 'about_content', 'advertisements'];
const adminOnlyTables = ['users', 'pending_teachers', 'teachers', 'students', 'class_joining_pending'];
const allTables = [...publicTables, ...adminOnlyTables];

import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getServerSession } from 'next-auth/next';

export async function GET(req) {
    try {
        const tableName = getTableName(req);
        const filters = getFilters(req);
        const session = await getServerSession(authOptions);
        
        validateTableName(tableName);
        await validateAccess(tableName, session);
        
        const results = await fetchData(tableName, session?.user, filters);
        console.log(results)
        return createResponse(results);

    } catch (error) {
        return handleError(error);
    }
}

function getTableName(req) {
    const { searchParams } = new URL(req.url);
    return searchParams.get('table');
}

function getFilters(req) {
    const { searchParams } = new URL(req.url);
    const filters = {};
    
    for (const [key, value] of searchParams.entries()) {
        if (key !== 'table') {
            filters[key] = value;
        }
    }
    
    return filters;
}

function validateTableName(tableName) {
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new ValidationError('Invalid table name');
    }

    if (!allTables.includes(tableName)) {
        throw new AccessError('Table not found');
    }
}

async function validateAccess(tableName, session) {
    const isPublic = publicTables.includes(tableName);
    const isAdmin = session?.user?.level === 2;
    if (isPublic) return;

    if (adminOnlyTables.includes(tableName)) {
        if (!session) {
            throw new AuthError('Authentication required');
        }
        if (!isAdmin) {
            throw new AccessError('Admin access required');
        }
    }
}

async function fetchData(tableName, user, filters = {}) {
    const isAdmin = user?.level === 2;
    const userId = user?.id;

    const whereConditions = [];
    const queryValues = [];
    // Add user-specific filters for restricted tables
    if (tableName === 'users' && !isAdmin && userId) {
        whereConditions.push('id = ?');
        queryValues.push(userId);
    }
    // Add query parameter filters
    for (const [key, value] of Object.entries(filters)) {
        // Sanitize column names
        if (!/^[a-zA-Z0-9_]+$/.test(key)) {
            throw new ValidationError('Invalid column name');
        }
        whereConditions.push(`${key} = ?`);
        queryValues.push(value);
    }

    let query = `SELECT * FROM ${tableName}`;
    if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    return executeQuery(query, queryValues);
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
    return new Response(JSON.stringify(data), { 
        status,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

function handleError(error) {
    console.error('API Error:', error);

    const errorMap = {
        ValidationError: 400,
        AccessError: 403,
        AuthError: 401,
        DatabaseError: 500
    };

    const status = errorMap[error.constructor.name] || 500;
    return createResponse({ error: error.message }, status);
}

// Error classes
class ValidationError extends Error { 
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class AccessError extends Error { 
    constructor(message) {
        super(message);
        this.name = 'AccessError';
    }
}

class AuthError extends Error { 
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}

class DatabaseError extends Error { 
    constructor(message) {
        super(message);
        this.name = 'DatabaseError';
    }
}
