import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if the session is valid
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    const userId = session.user.id;

    // Mark all notifications as read
    await markAllAsRead(userId);

    return new Response(JSON.stringify({ success: true, message: 'All notifications marked as read' }), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);

    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

async function markAllAsRead(userId) {
  try {
    await executeQueryWithRetry({
      query: 'UPDATE notifs SET read_status = 1 WHERE user_id = ? AND read_status = 0',
      values: [userId],
    });

    return { success: true };
  } catch (err) {
    console.error('Database update failed:', err);
    throw new Error('Database operation failed');
  }
}
