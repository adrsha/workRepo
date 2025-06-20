import { getServerSession } from "next-auth";
import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";

export async function POST(req) {
    try {
        const body = await req.json();
        const { classId } = body;

        // Get the session using NextAuth
        const session = await getServerSession(authOptions);
        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
        }

        // Validate admin level (level 1)
        if (session.user.level !== 1) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403 });
        }

        const result = await removeClass(classId);
        return new Response(JSON.stringify({
            success: true,
            message: 'Class deleted successfully',
            affectedRows: result.affectedRows
        }), { status: 200 });

    } catch (error) {
        console.error('Error deleting class:', error);
        return new Response(JSON.stringify({
            error: 'Failed to delete class',
            details: error.message
        }), { status: 500 });
    }
}

async function removeClass(classId) {
    try {
        // Use the stored procedure for safe deletion
        // This will handle all cascading deletes and file cleanup automatically
        const result = await executeQueryWithRetry({
            query: `CALL DeleteClass(?)`,
            values: [classId],
        });

        return result;
    } catch (err) {
        console.error('Class deletion failed:', err);
        throw new Error(`Failed to delete class: ${err.message}`);
    }
}
