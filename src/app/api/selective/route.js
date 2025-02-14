import { executeQueryWithRetry } from '../../lib/db';
import { getServerSession } from 'next-auth/next'; 
import { authOptions } from "../auth/[...nextauth]/authOptions";

const publicDataTables = ['grades', 'classes', 'courses', 'classes_users'];

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const tableName = searchParams.get('table');
        
        // Authorization check for sensitive data
        const session = await getServerSession({ authOptions });
        if (!session && !publicDataTables.includes(tableName)){
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), { status: 401 });
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

        // Construct the SQL query safely using the table name and parameters
        const query = `SELECT * FROM ${tableName} ${whereClause}`;
        console.log("Query", query);
        
        // Execute the query
        const results = await executeQueryWithRetry({
            query: query,
            values: values,
        });

        return new Response(JSON.stringify(results), { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
