import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const { classId, userId } = body;
    const session = await getServerSession(authOptions);

    console.log('classId:', classId);
    console.log('userId:', userId);
    // Check if the session is valid
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    // Check if the user is authorized to accept the payment
    if (session.user.level !== 2) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authorized to accept payment' }), { status: 401 });
    }

    // Validate the classId and userId
    if (!classId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing classId or userId' }), { status: 400 });
    }
    let addResponse = await addToDatabase(classId, userId);
    if (!addResponse.error) {
      await removeCurrentEntry(classId, userId);
    }

    return new Response(JSON.stringify({ message: 'Payment accepted' }), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);

    // More specific error handling
    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

async function addToDatabase(classId, userId) {
  try {
    const result = await executeQueryWithRetry({
      query: 'INSERT INTO classes_users (class_id, user_id) VALUES (?, ?)',
      values: [classId, userId],
    });
    return result;
  } catch (err) {
    console.error('Database insertion failed:', err);
    throw new Error('Database operation failed');
  }
}

async function removeCurrentEntry(classId, userId) {
  try {
    const result = await executeQueryWithRetry({
      query: 'DELETE FROM class_joining_pending WHERE class_id = ? AND user_id = ?',
      values: [classId, userId],
    });
    return result;
  } catch (err) {
    console.error('Database deletion failed:', err);
    throw new Error('Database operation failed');
  }
}
