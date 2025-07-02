import { authOptions } from '../auth/[...nextauth]/authOptions';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { executeQueryWithRetry } from '../../lib/db';
import { sendEmail } from '../../lib/email';

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
        const query = `SELECT pending_id, user_name, user_email, contact, secret_key, qualification, experience, certificate_path, expires_at FROM pending_teachers`;
        const results = await executeQueryWithRetry({ query });
        return results;
    } catch (error) {
        console.error('Database query failed:', error);
        throw new Error('Database query failed');
    }
}

// Helper function to get teacher details before processing
async function getTeacherDetails(pendingId) {
    try {
        const query = `SELECT user_name, user_email FROM pending_teachers WHERE pending_id = ?`;
        const results = await executeQueryWithRetry({ query, values: [pendingId] });
        return results[0] || null;
    } catch (error) {
        console.error('Error fetching teacher details:', error);
        throw new Error('Failed to fetch teacher details');
    }
}

// Email templates
function getApprovalEmailContent(teacherName) {
    return `
        Dear ${teacherName},

        Congratulations! Your teacher application has been approved.

        You can now log in to the platform using your registered credentials and start creating courses and teaching students.

        Welcome to our teaching community!

        Best regards,
        MeroTuit LMS Team
    `.trim();
}

function getRejectionEmailContent(teacherName) {
    return `
        Dear ${teacherName},

        Thank you for your interest in joining our platform as a teacher.

        Unfortunately, after careful review, we are unable to approve your application at this time. This decision may be based on various factors including qualification requirements or current capacity.

        If you believe this decision was made in error or if you would like to reapply in the future, please don't hesitate to contact our support team.

        Thank you for your understanding.

        Best regards,
        MeroTuit LMS Team
    `.trim();
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

        // Get teacher details before processing
        const teacherDetails = await getTeacherDetails(pendingId);
        if (!teacherDetails) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        const { user_name: teacherName, user_email: teacherEmail } = teacherDetails;

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

                // Get the last inserted user ID
                const result = await executeQueryWithRetry({
                    query: "SELECT LAST_INSERT_ID() AS lastId;",
                });
                const lastUserId = result[0]?.lastId;

                if (!lastUserId) {
                    throw new Error("Failed to retrieve last inserted ID.");
                }

                // Insert into teachers table
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

                // Send approval email
                try {
                    await sendEmail(
                        teacherEmail,
                        'Teacher Application Approved - Welcome to MeroTuit LMS',
                        getApprovalEmailContent(teacherName)
                    );
                    console.log(`Approval email sent to ${teacherEmail}`);
                } catch (emailError) {
                    console.error('Failed to send approval email:', emailError);
                    // Don't fail the entire operation if email fails
                }

                return NextResponse.json({ message: "Request approved and email sent" }, { status: 200 });

            } catch (error) {
                await executeQueryWithRetry({ query: "ROLLBACK;" });
                console.error("Transaction failed:", error);
                return NextResponse.json({ error: "Database error" }, { status: 500 });
            }
        } else {
            // Reject the teacher request
            try {
                const result = await executeQueryWithRetry({
                    query: "DELETE FROM merotuit_lms.pending_teachers WHERE pending_id = ?;",
                    values: [pendingId],
                });

                if (result.affectedRows > 0) {
                    // Send rejection email
                    try {
                        await sendEmail(
                            teacherEmail,
                            'Teacher Application Status - MeroTuit LMS',
                            getRejectionEmailContent(teacherName)
                        );
                        console.log(`Rejection email sent to ${teacherEmail}`);
                    } catch (emailError) {
                        console.error('Failed to send rejection email:', emailError);
                        // Don't fail the entire operation if email fails
                    }

                    return NextResponse.json({ message: "Request rejected and email sent" }, { status: 200 });
                } else {
                    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
                }
            } catch (error) {
                console.error("Error rejecting teacher:", error);
                return NextResponse.json({ error: "Database error" }, { status: 500 });
            }
        }
    } catch (error) {
        console.error("Error processing request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
