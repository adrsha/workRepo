const publicTables = ['grades', 'classes', 'courses', 'classes_users', 'notices'];

const allowedTables = [
  ...publicTables,
  'users',
  'teachers',
  'students',
  'class_joining_pending'
];

import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getServerSession } from 'next-auth/next';

export async function GET(req) {
  try {
    const tableName = getTableName(req);
    const session = await getServerSession(authOptions);
    
    validateTableName(tableName);
    await validateAccess(tableName, session);
    
    const results = await fetchData(tableName, session?.user);
    return createResponse(results);
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

async function validateAccess(tableName, session) {
  const isPublic = publicTables.includes(tableName);
  const isAdmin = session?.user?.level === 0;
  
  if (!isPublic && !session) {
    throw new AuthError('Unauthorized access');
  }
  
  // Admin can access everything, others follow normal rules
  if (isAdmin) return;
}

async function fetchData(tableName, user) {
  const isAdmin = user?.level === 0;
  const userId = user?.id;
  
  if (isAdmin) {
    return executeQuery(`SELECT * FROM ${tableName}`);
  }
  
  if (tableName === 'users' && userId) {
    return executeQuery(`SELECT * FROM ${tableName} WHERE user_id = ?`, [userId]);
  }
  
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
class ValidationError extends Error {}
class AccessError extends Error {}
class AuthError extends Error {}
class DatabaseError extends Error {}
