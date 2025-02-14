const publicTables = ['grades', 'classes', 'courses'];
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

        if (!publicTables.includes(tableName)) {
            const session = await getServerSession({ authOptions });
            if (!session) {
                return new Response(JSON.stringify({ error: 'Unauthorized access' }), { status: 401 });
            }
        }

        // If authenticated or public, process the query
        const results = await fetchDataFromDB(tableName);
        return new Response(JSON.stringify(results), { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

async function fetchDataFromDB(tableName) {
    try {
        const query = `SELECT * FROM ${tableName}`;
        const results = await executeQueryWithRetry({ query });

        return results;
    } catch (error) {
        console.error('Database query failed:', error);
        throw new Error(error.message);
    }
}
