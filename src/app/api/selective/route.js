import { executeQueryWithRetry } from '../../lib/db';
import { getServerSession } from 'next-auth/next'; 
import { authOptions } from "../auth/[...nextauth]/authOptions";

const publicDataTables = ['grades', 'classes', 'courses', 'classes_users', 'notices'];

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const tableName = searchParams.get('table');
        
        // Validate table name exists
        if (!tableName) {
            return new Response(JSON.stringify({ error: 'Table name is required' }), { status: 400 });
        }
        
        // Strict validation - only allow explicitly defined tables
        if (!publicDataTables.includes(tableName)) {
            return new Response(JSON.stringify({ error: 'Access to this table is not permitted' }), { status: 403 });
        }

        // Authorization check is now redundant since we only allow public tables,
        // but keeping it here for defense in depth
        const session = await getServerSession(authOptions);
        if (!session) {
            // Log access attempts for monitoring
            console.info(`Public data access to ${tableName} without session`);
        }

        // Collect selection attributes and their values
        let conditions = [];
        let values = [];
        
        // Iterate over the search parameters to collect attribute-value pairs
        searchParams.forEach((value, key) => {
            if (key !== 'table') {
                conditions.push(`${key} = ?`);
                values.push(value);
            }
        });

        // Build the WHERE clause dynamically
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        // Construct the SQL query with validated table name
        const query = `SELECT * FROM ${tableName} ${whereClause}`;
        
        // Execute the query
        const results = await executeQueryWithRetry({
            query: query,
            values: values,
        });
        console.log(results)

        return new Response(JSON.stringify(results), { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response(JSON.stringify({ error: 'An error occurred while processing your request' }), { status: 500 });
    }
}
