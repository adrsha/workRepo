// /app/api/teachers/[userId]/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';

export async function GET(req, { params }) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    const requestedUserId = parseInt(params.userId);

    // Check if user is authenticated
    if (!session) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    }

    // Validate the requested user ID
    if (isNaN(requestedUserId) || requestedUserId <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), { status: 400 });
    }

    // First, validate that the user is actually a teacher
    const userQuery = 'SELECT user_level FROM users WHERE user_id = ?';
    const userData = await executeQueryWithRetry({
      query: userQuery,
      values: [requestedUserId],
    });

    if (!userData || userData.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    if (userData[0].user_level !== 1) {
      return new Response(JSON.stringify({ error: 'Requested user is not a teacher' }), { status: 400 });
    }

    // Fetch teacher info
    // Note: Excluding sensitive fields like phone_number as requested
    const teacherQuery = `
      SELECT *
      FROM teachers t
      INNER JOIN users u ON t.user_id = u.user_id
      WHERE t.user_id = ?
    `;

    const teacherData = await executeQueryWithRetry({
      query: teacherQuery,
      values: [requestedUserId],
    });

    if (!teacherData || teacherData.length === 0) {
      return new Response(JSON.stringify({ error: 'Teacher profile not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(teacherData[0]), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);

    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
