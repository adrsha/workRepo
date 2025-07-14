const publicTables = ['grades', 'classes', 'courses', 'classes_users', 'notices'];

const adminOnlyTables = ['users', 'pending_teachers', 'teachers', 'students', 'class_joining_pending'];

const allTables = [...publicTables, ...adminOnlyTables];

import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getServerSession } from 'next-auth/next';

export async function GET(req) {
    try {
        const tableName = getTableName(req);
        const session = await getServerSession(authOptions);
        validateTableName(tableName);
        if (session) {
            await validateAccess(tableName, session);
            const results = await fetchData(tableName, session?.user);
            return createResponse(results);
        }
        return createResponse({});

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

    if (!allTables.includes(tableName)) {
        throw new AccessError('Table not found');
    }
}

async function validateAccess(tableName, session) {
    const isPublic = publicTables.includes(tableName);
    const isAdmin = session?.user?.level === 2;

    // Public tables: anyone can access
    if (isPublic) return;

    // Admin-only tables: require authentication and admin level
    if (adminOnlyTables.includes(tableName)) {
        if (!session) {
            throw new AuthError('Authentication required');
        }
        if (!isAdmin) {
            throw new AccessError('Admin access required');
        }
    }
}

async function fetchData(tableName, user) {
    const isAdmin = user?.level === 2;
    const userId = user?.id;

    // Admin gets full table access
    if (isAdmin) {
        return executeQuery(`SELECT * FROM ${tableName}`);
    }

    // For non-admin users accessing their own data
    if (tableName === 'users' && userId) {
        return executeQuery(`SELECT * FROM ${tableName} WHERE user_id = ?`, [userId]);
    }

    // Default: full table access for public tables
    return executeQuery(`SELECT * FROM ${tableName}`);
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

// Custom error classes
class ValidationError extends Error { }
class AccessError extends Error { }
class AuthError extends Error { }
class DatabaseError extends Error { }
