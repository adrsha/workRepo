// Add imports
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { executeQueryWithRetry } from '../../lib/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const { pendingId } = body;
    const session = await getServerSession(authOptions);

    // Check if the session is valid
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    // Check if the user is authorized to reject the payment
    if (session.user.level !== 2) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authorized to reject payment' }), { status: 401 });
    }

    // Validate pendingId
    if (!pendingId) {
      return new Response(JSON.stringify({ error: 'Missing pendingId' }), { status: 400 });
    }

    await removeFromDatabase(pendingId);

    return new Response(JSON.stringify({ message: 'Payment rejected' }), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);

    // More specific error handling
    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
async function removeFromDatabase(pendingId) {
  try {
    const result = await executeQueryWithRetry({
      query: 'DELETE FROM class_joining_pending WHERE pending_id = ?',
      values: [pendingId],
    });
    return result;
  } catch (err) {
    console.error('Database deletion failed:', err);
    throw new Error('Database operation failed');
  }
}
