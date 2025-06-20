import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';

export async function GET(req) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);

    // Check if the session is valid
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    // Extract the user ID from the session
    const userId = session.user.id;

    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || 10;
    const offset = searchParams.get('offset') || 0;
    const readStatus = searchParams.get('read_status'); // 'read', 'unread', or null for all

    // Get notifications for the user
    const notifications = await getUserNotifications(userId, limit, offset, readStatus);

    return new Response(JSON.stringify({ notifications }), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);

    // More specific error handling
    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { notificationId, action } = body;
    const session = await getServerSession(authOptions);

    // Check if the session is valid
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    const userId = session.user.id;

    // Validate input
    if (!notificationId) {
      return new Response(JSON.stringify({ error: 'Missing notificationId' }), { status: 400 });
    }

    let result;
    if (action === 'mark-read') {
      // Mark notification as read
      result = await markNotificationAsRead(notificationId, userId);
    } else if (action === 'delete') {
      // Delete notification
      result = await deleteNotification(notificationId, userId);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Notification updated' }), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);

    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

async function getUserNotifications(userId, limit, offset, readStatus = null) {
  try {
    let query = 'SELECT * FROM notifs WHERE user_id = ?';
    const values = [userId];

    // Handle different filter types
    if (readStatus === 'unread') {
      query += ' AND read_status = 0';
    } else if (readStatus === 'read') {
      query += ' AND read_status = 1';
    }
    // If readStatus is null, return all notifications

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    values.push(parseInt(limit), parseInt(offset));

    const result = await executeQueryWithRetry({
      query,
      values,
    });
    return result;
  } catch (err) {
    console.error('Database fetch failed:', err);
    throw new Error('Database operation failed');
  }
}

async function markNotificationAsRead(notificationId, userId) {
  try {
    const result = await executeQueryWithRetry({
      query: 'UPDATE notifs SET read_status = 1 WHERE notif_id = ? AND user_id = ?',
      values: [notificationId, userId],
    });

    if (result.affectedRows === 0) {
      return { error: 'Notification not found or not owned by user' };
    }

    return { success: true };
  } catch (err) {
    console.error('Database update failed:', err);
    throw new Error('Database operation failed');
  }
}

async function deleteNotification(notificationId, userId) {
  try {
    const result = await executeQueryWithRetry({
      query: 'DELETE FROM notifs WHERE notif_id = ? AND user_id = ?',
      values: [notificationId, userId],
    });

    if (result.affectedRows === 0) {
      return { error: 'Notification not found or not owned by user' };
    }

    return { success: true };
  } catch (err) {
    console.error('Database deletion failed:', err);
    throw new Error('Database operation failed');
  }
}
