import { executeQueryWithRetry } from '../../lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions"; // Adjust the path based on your project structure

const lockedViews = ["pending_teachers_view", "students_view"];

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const viewName = searchParams.get('view');

        // Check if requested view requires authorization
        if (lockedViews.includes(viewName)) {
            // Get session from NextAuth
            const session = await getServerSession(authOptions);
            // Check if user is authenticated and has required level
            if (!session || !session.user || session.user.level !== 2) {
                return new Response(JSON.stringify({ error: 'Unauthorized access' }), { status: 403 });
            }
        }

        const results = await fetchDataFromDB(viewName);
        return new Response(JSON.stringify(results), { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

async function fetchDataFromDB(viewName) {
    try {
        // Validate viewName to prevent SQL injection
        if (!viewName || !viewName.match(/^[a-zA-Z0-9_]+$/)) {
            throw new Error('Invalid view name');
        }

        const query = `SELECT * FROM ${viewName}`;
        const results = await executeQueryWithRetry({ query });

        return results;
    } catch (error) {
        console.error('Database query failed:', error);
        throw new Error(error.message);
    }
}
