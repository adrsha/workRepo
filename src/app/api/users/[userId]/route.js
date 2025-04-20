import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';

export async function GET(req, { params }) {
  const par = await params;
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    const requestedUserId = parseInt(par.userId);

    // Validate the requested user ID
    if (isNaN(requestedUserId) || requestedUserId <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), { status: 400 });
    }

    // First, get basic user info to determine user level
    const userQuery = 'SELECT user_id, user_name, user_email, user_level FROM users WHERE user_id = ?';
    const userData = await executeQueryWithRetry({
      query: userQuery,
      values: [requestedUserId],
    });

    if (!userData || userData.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const user = userData[0];
    const userLevel = user.user_level;

    // Handle permissions:
    // 1. If requested profile is a student (level 0):
    //    - Allow if viewer is the student themselves
    //    - Allow if viewer is an admin (level 2)
    //    - Deny otherwise
    // 2. If requested profile is a teacher (level 1):
    //    - Allow access to limited info for any authenticated user
    // 3. If requested profile is an admin (level 2):
    //    - Allow if viewer is an admin
    //    - Deny otherwise

    if (userLevel === 0) { // Student profile
      if (!session) {
        return new Response(JSON.stringify({ error: 'Authentication required to view student profiles' }), { status: 401 });
      }

      if (session.user.id !== requestedUserId && session.user.level !== 2) {
        return new Response(JSON.stringify({ error: 'You do not have permission to view this student profile' }), { status: 403 });
      }

      // Fetch student-specific data
      const studentQuery = `
        SELECT s.* 
        FROM students s
        WHERE s.user_id = ?
      `;
      const studentData = await executeQueryWithRetry({
        query: studentQuery,
        values: [requestedUserId],
      });

      // Return combined user and student data
      return new Response(JSON.stringify({
        ...user,
        student_data: studentData[0] || {},
      }), { status: 200 });
    }
    else if (userLevel === 1) { // Teacher profile
      // For teachers, we return public information to anyone
      // But we require authentication
      if (!session) {
        return new Response(JSON.stringify({ error: 'Authentication required to view profiles' }), { status: 401 });
      }

      // Fetch teacher-specific data, excluding sensitive information
      const teacherQuery = `
        SELECT *
        FROM teachers t
        WHERE t.user_id = ?
      `;
      const teacherData = await executeQueryWithRetry({
        query: teacherQuery,
        values: [requestedUserId],
      });

      // Return combined user and teacher data
      return new Response(JSON.stringify({
        ...user,
        teacher_data: teacherData[0] || {},
      }), { status: 200 });
    }
    else if (userLevel === 2) { // Admin profile
      // Only admins can view admin profiles
      if (!session || session.user.level !== 2) {
        return new Response(JSON.stringify({ error: 'You do not have permission to view this profile' }), { status: 403 });
      }

      // Return admin data
      return new Response(JSON.stringify(user), { status: 200 });
    }

    // Default case - shouldn't reach here
    return new Response(JSON.stringify({ error: 'Invalid user level' }), { status: 400 });

  } catch (error) {
    console.error('Error processing request:', error);

    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
