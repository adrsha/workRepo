// /app/api/students/[userId]/route.js
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

    // Check permissions - only allow if self or admin
    if (session.user.id !== requestedUserId && session.user.level !== 2) {
      return new Response(JSON.stringify({ error: 'You do not have permission to view this student profile' }), { status: 403 });
    }

    // Validate that the user is actually a student
    const userQuery = 'SELECT user_level FROM users WHERE user_id = ?';
    const userData = await executeQueryWithRetry({
      query: userQuery,
      values: [requestedUserId],
    });

    if (!userData || userData.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    if (userData[0].user_level !== 0) {
      return new Response(JSON.stringify({ error: 'Requested user is not a student' }), { status: 400 });
    }

    // Fetch student info with all details
    const studentQuery = `
      SELECT 
        s.*
      FROM students s
      WHERE s.user_id = ?
    `;

    const studentData = await executeQueryWithRetry({
      query: studentQuery,
      values: [requestedUserId],
    });

    if (!studentData || studentData.length === 0) {
      return new Response(JSON.stringify({ error: 'Student profile not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(studentData[0]), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);

    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
