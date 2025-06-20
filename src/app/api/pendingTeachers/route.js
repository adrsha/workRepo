import { authOptions } from '../auth/[...nextauth]/authOptions';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { executeQueryWithRetry } from '../../lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
  }

  if (session.user.level !== 2) {
    return NextResponse.json({ error: 'Unauthorized: User not authorized' }, { status: 403 });
  }

  try {
    const fetchedUsers = await fetchPendingAdmins();
    return NextResponse.json(fetchedUsers);
  } catch (error) {
    console.error('Error fetching pending admins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchPendingAdmins() {
  try {
    // Include certificate_path in the SELECT query
    const query = `SELECT pending_id, user_name, user_email, contact, secret_key, qualification, experience, certificate_path, expires_at FROM pending_teachers`;
    const results = await executeQueryWithRetry({ query });
    return results;
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed');
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { pendingId, approved } = body;

    // Input validation
    if (!pendingId || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 });
    }

    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
    }

    // Authorization check
    if (session.user.level !== 2) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    if (approved) {
      try {
        // Start transaction
        await executeQueryWithRetry({ query: "START TRANSACTION;" });

        // Insert user into the users table
        await executeQueryWithRetry({
          query: `
            INSERT INTO merotuit_lms.users(
              user_name,
              user_email,
              contact,
              user_passkey,
              user_level
            )
            SELECT
              user_name,
              user_email,
              contact,
              user_passkey,
              1 AS user_level
            FROM
              merotuit_lms.pending_teachers
            WHERE
              pending_id = ?;
          `,
          values: [pendingId],
        });

        // Capture the last inserted user ID
        const result = await executeQueryWithRetry({
          query: "SELECT LAST_INSERT_ID() AS lastId;",
        });
        const lastUserId = result[0]?.lastId;

        if (!lastUserId) {
          throw new Error("Failed to retrieve last inserted ID.");
        }

        await executeQueryWithRetry({
          query: `
            INSERT INTO merotuit_lms.teachers(
              user_id,
              qualification,
              experience,
              certificate_path
            )
            SELECT
              ?, 
              qualification, 
              experience,
              certificate_path
            FROM
              merotuit_lms.pending_teachers
            WHERE
              pending_id = ?;
          `,
          values: [lastUserId, pendingId],
        });

        // Delete from pending_teachers
        await executeQueryWithRetry({
          query: "DELETE FROM merotuit_lms.pending_teachers WHERE pending_id = ?;",
          values: [pendingId],
        });

        // Commit transaction
        await executeQueryWithRetry({ query: "COMMIT;" });

        return NextResponse.json({ message: "Request approved" }, { status: 200 });
      } catch (error) {
        await executeQueryWithRetry({ query: "ROLLBACK;" });
        console.error("Transaction failed:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    } else {
      // Reject the admin request
      const result = await executeQueryWithRetry({
        query: "DELETE FROM merotuit_lms.pending_teachers WHERE pending_id = ?;",
        values: [pendingId],
      });
      return NextResponse.json({ message: result ? "Request rejected" : "Database error" }, { status: 200 });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
