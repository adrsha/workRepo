import { getServerSession } from "next-auth";
import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from "../auth/[...nextauth]/authOptions";  // Ensure to import your NextAuth authOptions

export async function POST(req) {
  try {
    const body = await req.json();
    const { courseId, gradeId, startTime, endTime, repeatEveryNDay, classDescription } = body;
    console.log(body)
        
    // Get the session using NextAuth
    const session = await getServerSession(authOptions); // Fetch session using NextAuth.js session management
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    const teacherId = session.user.id;
    const userLevel = session.user.level;

    // Validate the user level
    if (userLevel !== 1) {
      return new Response(JSON.stringify({ error: 'Invalid user level' }), { status: 400 });
    }

    // NextAuth token validation: no need to manually validate the token if you're using NextAuth.
    // Just check the session object for its validity (session already contains the token)
    if (!session.accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Token not valid' }), { status: 401 });
    }
    console.log("INP", repeatEveryNDay);
        
    const response = await insertClasses(teacherId, courseId, gradeId, startTime, endTime, repeatEveryNDay, classDescription);
    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

async function insertClasses(userId, courseId, gradeId, startTime, endTime, repeatEveryNDay, classDescription) {
  try {
    const result = await executeQueryWithRetry({
      query: `INSERT INTO classes (course_id, teacher_id, grade_id, start_time, end_time, repeat_every_n_day, class_description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      values: [courseId, userId, gradeId, startTime, endTime, repeatEveryNDay, classDescription],
    });
    return result;
  } catch (err) {
    console.error('Database insertion failed:', err);
    throw new Error('Database operation failed');
  }
}
