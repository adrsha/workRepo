import { getServerSession } from "next-auth";
import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";

// Define allowable tables and their fields that can be updated
const DISALLOWED_TABLES = {
  'users': ['user_passkey'],
  'pending_teachers': ['user_passkey'],
};

// Map of table names to their primary key column names
const TABLE_PRIMARY_KEYS = {
  'classes': 'class_id',
  'students': 'studentId',
  'teachers': 'teacherId',
  'users': 'user_id',
  'pending_teachers': 'pending_id',
};

// Default primary key name if not specified in TABLE_PRIMARY_KEYS
const DEFAULT_PRIMARY_KEY = 'id';

// Validation function to prevent SQL injection and ensure field safety
function validateField(table, field) {
  if (!DISALLOWED_TABLES[table]) {
    return true;
  }
  
  return !(DISALLOWED_TABLES[table].includes(field));
}

// Validate table name against SQL injection patterns
function isValidTableName(tableName) {
  // Only allow alphanumeric characters and underscores
  return /^[a-zA-Z0-9_]+$/.test(tableName);
}

export async function PUT(req) {
    try {
        // Parse the request body
        const body = await req.json();
        const { table, id, updates } = body;
        
        // Validate required inputs
        if (!table || !id || !updates || typeof updates !== 'object') {
            return new Response(JSON.stringify({ error: 'Invalid request parameters' }), { status: 400 });
        }
        
        // Validate table name to prevent SQL injection
        if (!isValidTableName(table)) {
            return new Response(JSON.stringify({ error: 'Invalid table name' }), { status: 400 });
        }
        
        // Check if the table is in our allowed tables list
        if (DISALLOWED_TABLES[table] && Object.keys(DISALLOWED_TABLES[table]).length > 0) {
            // Only prevent if there are explicitly disallowed fields
            const hasDisallowedFields = Object.keys(updates).some(field => 
                DISALLOWED_TABLES[table].includes(field)
            );
            
            if (hasDisallowedFields) {
                return new Response(JSON.stringify({ error: 'Some fields are not allowed for updates' }), { status: 403 });
            }
        }
        
        // Validate ID is a number
        if (isNaN(parseInt(id))) {
            return new Response(JSON.stringify({ error: 'Invalid ID parameter' }), { status: 400 });
        }
        
        // Get the session using NextAuth
        const session = await getServerSession(authOptions);
        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
        }

        const userId = session.user.id;
        const userLevel = session.user.level;

        // Validate the user level - only allow admin users (level 2)
        if (userLevel !== 2) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403 });
        }
        
        // Verify the session has a valid token
        if (!session.accessToken) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Token not valid' }), { status: 401 });
        }

        // Filter updates to only include allowed fields
        const sanitizedUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
            if (validateField(table, key)) {
                sanitizedUpdates[key] = value;
            }
        }
        
        // If no valid fields to update, return error
        if (Object.keys(sanitizedUpdates).length === 0) {
            return new Response(JSON.stringify({ error: 'No valid fields to update' }), { status: 400 });
        }

        // Get the primary key column name for this table
        const primaryKeyColumn = TABLE_PRIMARY_KEYS[table] || DEFAULT_PRIMARY_KEY;

        // Call function to update data with the correct primary key
        const response = await updateTableData(table, id, sanitizedUpdates, primaryKeyColumn);
        
        // Add audit log
        await logAdminAction(userId, table, id, sanitizedUpdates);
        
        return new Response(JSON.stringify(response), { status: 200 });
    } catch (error) {
        console.error('Error processing admin update request:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}

async function updateTableData(table, id, updates, primaryKeyColumn) {
    try {
        // Construct the SQL query with parameterized queries
        const updateFields = Object.keys(updates).map(key => `\`${key}\` = ?`).join(', ');
        const updateValues = Object.values(updates);
        
        // Add the ID value to the array of values
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

// Add an audit log entry for each admin action
async function logAdminAction(adminId, table, recordId, updates) {
    try {
        const actionDetails = JSON.stringify({
            table: table,
            recordId: recordId,
            changes: updates
        });
        
        await executeQueryWithRetry({
            query: `INSERT INTO admin_audit_logs (admin_id, action_type, action_details, timestamp) 
                   VALUES (?, 'UPDATE', ?, NOW())`,
            values: [adminId, actionDetails],
        });
    } catch (err) {
        console.error('Failed to log admin action:', err);
        // We don't throw here to avoid disrupting the main operation
    }
}
