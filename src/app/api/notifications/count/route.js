import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if the session is valid
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    const userId = session.user.id;

    // Get count of unread notifications
    const unreadCount = await getUnreadCount(userId);

    return new Response(JSON.stringify({ unreadCount }), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);

    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

async function getUnreadCount(userId) {
  try {
    const result = await executeQueryWithRetry({
      query: 'SELECT COUNT(*) as count FROM notifs WHERE user_id = ? AND read_status = 0',
      values: [userId],
    });

    return result[0].count;
  } catch (err) {
    console.error('Database count failed:', err);
    throw new Error('Database operation failed');
  }
}
