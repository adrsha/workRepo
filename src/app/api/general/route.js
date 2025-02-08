import { executeQueryWithRetry } from '../../lib/db';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const table = searchParams.get('table');

        const allowedTables = ['users', 'classes', 'courses', 'classes_courses_relational'];
        if (!allowedTables.includes(table)) {
            return Response.json({ error: 'Invalid table name' }, { status: 400 });
        }

        const query = `SELECT * FROM ${table}`;
        const results = await executeQueryWithRetry({ query });

        return Response.json(results);
    } catch (error) {
        console.error('Database query failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
