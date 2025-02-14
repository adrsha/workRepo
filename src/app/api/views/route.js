import { executeQueryWithRetry } from '../../lib/db';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const viewName = searchParams.get('view');
        
        const results = await fetchDataFromDB(viewName);
        return new Response(JSON.stringify(results), { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

async function fetchDataFromDB(viewName) {
    try {
        const query = `SELECT * FROM ${viewName}`;
        const results = await executeQueryWithRetry({ query });

        return results;
    } catch (error) {
        console.error('Database query failed:', error);
        throw new Error(error.message);
    }
}
