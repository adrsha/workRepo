const publicTables = ['grades', 'classes', 'courses', 'classes_users', 'notices'];

const allowedTables = [
  ...publicTables,
  'users',
  'classes_users',
  'class_joining_pending',
  'grades'
];

import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getServerSession } from 'next-auth/next';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tableName = searchParams.get('table');

    // Validate if the table name is valid
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return new Response(JSON.stringify({ error: 'Invalid table name' }), { status: 400 });
    }

    // Check if the requested table is allowed
    if (!allowedTables.includes(tableName)) {
      return new Response(JSON.stringify({ error: 'Table access not permitted' }), { status: 403 });
    }

    // Authorization check for non-public tables
    if (!publicTables.includes(tableName)) {
      const session = await getServerSession(authOptions);
      if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized access' }), { status: 401 });
      }
    }

    // Process the query
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const results = await fetchDataFromDB(tableName, userId);
    return new Response(JSON.stringify(results), { status: 200 });
  } catch (error) {
    console.error('Database query failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

async function fetchDataFromDB(tableName, userId) {
  try {
    let query;
    let values = [];

    // Special case for users table - only return current user data
    if (tableName === 'users' && userId) {
      query = `SELECT * FROM ${tableName} WHERE user_id = ?`;
      values = [userId];
    } else {
      // For other tables, return all rows
      query = `SELECT * FROM ${tableName}`;
    }

    const results = await executeQueryWithRetry({ query, values });
    return results;
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error(error.message);
  }
}
