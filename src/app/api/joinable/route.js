import { executeQueryWithRetry } from '../../lib/db';
import { getSession } from 'next-auth/react'; // Import NextAuth's session utility

const publicTables = ['grades', 'classes', 'courses']; // Adjust to your requirements

export async function GET(req) {
    try {
        // Extract query parameters
        const { searchParams } = new URL(req.url);
        const tables = searchParams.getAll('table');
        const joinConditions = searchParams.getAll('join');
        const selectionAttrs = searchParams.get('selectionAttrs') || '*';

        // Validate table and join conditions
        if (tables.length < 2 || joinConditions.length !== tables.length - 1) {
            return new Response(JSON.stringify({ error: 'Mismatch between tables and join conditions' }), {
                status: 400,
            });
        }

        // Validate table names to prevent SQL injection
        if (!tables.every((table) => /^[a-zA-Z0-9_]+$/.test(table))) {
            return new Response(JSON.stringify({ error: 'Invalid table names' }), { status: 400 });
        }

        // Validate join conditions (allowing for AND conditions)
        const joinConditionRegex = /^[a-zA-Z0-9_\.]+ (?:=|!=|<|>|<=|>=) [a-zA-Z0-9_\.]+( (AND|OR) [a-zA-Z0-9_\.]+ (?:=|!=|<|>|<=|>=) [a-zA-Z0-9_\.]+)*$/;
        if (!joinConditions.every((cond) => joinConditionRegex.test(cond))) {
            return new Response(JSON.stringify({ error: 'Invalid join condition' }), { status: 400 });
        }

        const session = await getSession({ req });
        if (!session && !tables.every((table) => publicTables.includes(table))) {
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), { status: 401 });
        }

        let joinQuery = tables[0]; 
        let whereClause = '';
        const values = [];

        for (let i = 1; i < tables.length; i++) {
            const tableB = tables[i];
            const joinCondition = joinConditions[i - 1];

            joinQuery += ` JOIN ${tableB} ON ${joinCondition}`;
        }

        // Process additional filters
        searchParams.forEach((value, key) => {
            if (!['table', 'join', 'selectionAttrs'].includes(key)) {
                whereClause += ` AND ${key} = ?`;
                values.push(value);
            }
        });

        // Build the final SQL query
        const query = `
            SELECT ${selectionAttrs} 
            FROM ${joinQuery} 
            ${whereClause ? 'WHERE ' + whereClause.substring(5) : ''}
        `;

        // Execute the query
        const results = await executeQueryWithRetry({ query, values });

        return new Response(JSON.stringify(results), { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
