const publicTables = ['grades', 'classes', 'courses'];
import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getServerSession } from 'next-auth/next';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), { status: 401 });
        }

        const body = await req.json();
        const { data, conditions } = body;

        if (!data || !conditions || typeof data !== 'object' || typeof conditions !== 'object') {
            return new Response(JSON.stringify({ error: 'Invalid request format' }), { status: 400 });
        }

        // Validate that the user can only update their own profile
        console.log(conditions)
        if (conditions.user_id !== session.user.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized operation' }), { status: 403 });
        }

        const results = await updateDataInDB('users', data, conditions);
        return new Response(JSON.stringify(results), { status: 200 });

    } catch (error) {
        console.error('Update operation failed:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}

async function updateDataInDB(tableName, data, conditions) {
    try {
        // Build SET clause
        const setEntries = Object.entries(data);
        const setClauses = setEntries.map(([key]) => `${key} = ?`).join(', ');
        
        // Build WHERE clause
        const whereEntries = Object.entries(conditions);
        const whereClauses = whereEntries.map(([key]) => `${key} = ?`).join(' AND ');

        // Combine all values for parameterized query
        const values = [...setEntries.map(([, value]) => value), ...whereEntries.map(([, value]) => value)];

        const query = `UPDATE ${tableName} SET ${setClauses} WHERE ${whereClauses}`;
        
        const results = await executeQueryWithRetry({ 
            query,
            values 
        });

        return {
            success: true,
            affectedRows: results.affectedRows
        };

    } catch (error) {
        console.error('Database update failed:', error);
        throw new Error('Database update failed');
    }
}
