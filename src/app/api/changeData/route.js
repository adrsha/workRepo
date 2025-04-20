import { getServerSession } from "next-auth";
import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";

// Define allowed tables explicitly rather than just disallowed fields
const ALLOWED_TABLES = [
  'users',
  'pending_teachers',
  'classes',
  'students',
  'teachers',
];

const DISALLOWED_FIELDS = {
  'users': ['user_passkey'],
  'pending_teachers': ['user_passkey'],
  // Define disallowed fields for other tables
  'classes': [],
  'students': [],
  'teachers': [],
};

// Map of table names to their primary key column names
const TABLE_PRIMARY_KEYS = {
  'classes': 'class_id',
  'students': 'user_id',
  'teachers': 'user_id',
  'users': 'user_id',
  'pending_teachers': 'pending_id',
};

// Default primary key name if not specified in TABLE_PRIMARY_KEYS
const DEFAULT_PRIMARY_KEY = 'id';

// Validation function to prevent SQL injection and ensure field safety
function validateField(table, field) {
  // Only allow properly formed field names to prevent SQL injection
  if (!/^[a-zA-Z0-9_]+$/.test(field)) {
    return false;
  }

  // Check if this field is explicitly disallowed
  if (DISALLOWED_FIELDS[table] && DISALLOWED_FIELDS[table].includes(field)) {
    return false;
  }

  return true;
}

// Validate table name against SQL injection patterns and ensure it's allowed
function isValidTable(tableName) {
  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return false;
  }

  // Only allow tables from our explicitly allowed list
  return ALLOWED_TABLES.includes(tableName);
}

export async function PUT(req) {
  try {
    // Get the session first to avoid wasting time on unauthorized requests
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    console.log(session);
    const userId = session.user.id;
    const userLevel = session.user.level;
    // Strict enforcement of admin level (2)
    if (userLevel !== 2) {
      // Log unauthorized access attempts
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403 });
    }

    // Verify the session has a valid token
    if (!session.accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Token not valid' }), { status: 401 });
    }

    // Parse the request body with a try/catch to handle malformed JSON
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400 });
    }

    const { table, id, updates } = body;

    // Validate required inputs
    if (!table || id === undefined || !updates || typeof updates !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), { status: 400 });
    }

    // Validate table name and check if it's in our allowed tables list
    if (!isValidTable(table)) {
      await logSecurityEvent(userId, 'INVALID_TABLE_ACCESS', {
        table,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });
      return new Response(JSON.stringify({ error: 'Invalid or disallowed table name' }), { status: 403 });
    }

    // Ensure ID is a valid integer
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId.toString() !== id.toString()) {
      return new Response(JSON.stringify({ error: 'Invalid ID parameter' }), { status: 400 });
    }

    // Check for maximum allowed update fields (to prevent DoS)
    if (Object.keys(updates).length > 50) {
      return new Response(JSON.stringify({ error: 'Too many fields in update request' }), { status: 400 });
    }

    // Filter updates to only include allowed fields
    const sanitizedUpdates = {};
    const rejectedFields = [];

    for (const [key, value] of Object.entries(updates)) {
      if (validateField(table, key)) {
        // Additional type validation for values to prevent injection
        if (typeof value === 'string' && value.length > 5000) {
          return new Response(JSON.stringify({ error: `Field value too large for ${key}` }), { status: 400 });
        }
        sanitizedUpdates[key] = value;
      } else {
        rejectedFields.push(key);
      }
    }

    // If fields were rejected, log it
    if (rejectedFields.length > 0) {
      await logSecurityEvent(userId, 'DISALLOWED_FIELD_UPDATE_ATTEMPT', {
        table,
        fields: rejectedFields
      });
    }

    // If no valid fields to update, return error
    if (Object.keys(sanitizedUpdates).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields to update' }), { status: 400 });
    }

    // Get the primary key column name for this table
    const primaryKeyColumn = TABLE_PRIMARY_KEYS[table] || DEFAULT_PRIMARY_KEY;

    // Verify the record exists before attempting to update it
    const recordExists = await checkRecordExists(table, numericId, primaryKeyColumn);
    if (!recordExists) {
      return new Response(JSON.stringify({
        error: `Record with ID ${numericId} not found in ${table}`
      }), { status: 404 });
    }

    // Check if any updates would create duplicate values for columns that should be unique
    const duplicateCheck = await checkForDuplicates(table, numericId, sanitizedUpdates, primaryKeyColumn);
    if (duplicateCheck.hasDuplicate) {
      return new Response(JSON.stringify({
        error: `Cannot update: ${duplicateCheck.field} with value "${duplicateCheck.value}" already exists in the table`
      }), { status: 409 });
    }

    // Call function to update data with the correct primary key
    const response = await updateTableData(table, numericId, sanitizedUpdates, primaryKeyColumn);

    // Add audit log
    await logAdminAction(userId, table, numericId, sanitizedUpdates);

    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error) {
    console.error('Error processing admin update request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

// Check if a record exists before trying to update it
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

// Function to check for potential duplicates before updating
async function checkForDuplicates(table, id, updates, primaryKeyColumn) {
  // Default result with no duplicates
  const result = { hasDuplicate: false, field: null, value: null };

  try {
    // Get table metadata to identify unique columns
    const tableInfo = await executeQueryWithRetry({
      query: `SHOW INDEXES FROM \`${table}\` WHERE Non_unique = 0 AND Key_name != 'PRIMARY'`,
      values: [],
    });

    // Extract unique column names
    const uniqueColumns = tableInfo
      .filter(index => index.Column_name)
      .map(index => index.Column_name);

    // Check only unique columns for duplicates
    for (const field of Object.keys(updates)) {
      const value = updates[field];

      // Skip null values, empty strings, or non-unique columns
      if (value === null || value === '' || !uniqueColumns.includes(field)) continue;

      // Check if this value would create a duplicate in a unique field
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

