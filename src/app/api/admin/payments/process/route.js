// app/api/admin/payments/process/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../../lib/db';

export async function POST(req) {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.level < 1) {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    return handleProcessPayment(req, session);
}

async function handleProcessPayment(req, session) {
    try {
        const { paymentId, action, adminNotes = '' } = await req.json();

        if (!paymentId || !action || !['approve', 'reject'].includes(action)) {
            return Response.json({ error: 'Invalid payment ID or action' }, { status: 400 });
        }

        // Get payment details
        const paymentQuery = `
            SELECT cp.payment_id,
                   cp.user_id,
                   cp.content_id,
                   cp.entity_type,
                   cp.entity_id,
                   cp.amount,
                   cp.status,
                   u.user_name,
                   u.user_email,
                   c.content_data
            FROM content_payments cp
            JOIN users u ON cp.user_id = u.user_id
            LEFT JOIN content c ON cp.content_id = c.content_id
            WHERE cp.payment_id = ? AND cp.status = 'pending'
        `;

        const paymentResult = await executeQueryWithRetry({
            query: paymentQuery,
            values: [paymentId],
        });

        if (!paymentResult?.length) {
            return Response.json(
                { error: 'Payment not found or already processed' },
                { status: 404 }
            );
        }

        const payment = paymentResult[0];

        // Update payment status
        const updatePaymentQuery = `
            UPDATE content_payments 
            SET status = ?, 
                processed_at = NOW(), 
                processed_by = ?, 
                admin_notes = ?
            WHERE payment_id = ?
        `;

        await executeQueryWithRetry({
            query: updatePaymentQuery,
            values: [
                action === 'approve' ? 'approved' : 'rejected',
                session.user.id,
                adminNotes || null,
                paymentId,
            ],
        });

        // If approved, grant access
        if (action === 'approve') {
            const existingPermissionQuery = `
                SELECT permission_id 
                FROM content_user_permissions 
                WHERE user_id = ? AND content_id = ? AND entity_type = ? AND entity_id = ?
            `;

            const existingPermission = await executeQueryWithRetry({
                query: existingPermissionQuery,
                values: [
                    payment.user_id,
                    payment.content_id,
                    payment.entity_type,
                    payment.entity_id,
                ],
            });

            if (!existingPermission?.length) {
                const grantPermissionQuery = `
                    INSERT INTO content_user_permissions 
                    (user_id, content_id, entity_type, entity_id, granted_by, granted_at) 
                    VALUES (?, ?, ?, ?, ?, NOW())
                `;

                await executeQueryWithRetry({
                    query: grantPermissionQuery,
                    values: [
                        payment.user_id,
                        payment.content_id,
                        payment.entity_type,
                        payment.entity_id,
                        session.user.id,
                    ],
                });
            }
        }

        // Send notification
        const notificationMessage =
            action === 'approve'
                ? `Your payment of Rs. ${parseFloat(payment.amount).toFixed(
                      2
                  )} has been approved! You now have access to the content.`
                : `Your payment of Rs. ${parseFloat(payment.amount).toFixed(
                      2
                  )} has been rejected. ${
                      adminNotes ? 'Reason: ' + adminNotes : ''
                  }`;

        const notificationQuery = `
            INSERT INTO notifs 
            (user_id, message, read_status, created_at, link, notif_type, meta_id) 
            VALUES (?, ?, 0, NOW(), ?, ?, ?)
        `;

        await executeQueryWithRetry({
            query: notificationQuery,
            values: [
                payment.user_id,
                notificationMessage,
                `/content/${payment.content_id}`,
                'payment',
                paymentId,
            ],
        });

        // Get content title for response
        let contentTitle = 'Unknown Content';
        try {
            if (payment.content_data) {
                const data = JSON.parse(payment.content_data);
                contentTitle =
                    data.title ||
                    (data.text?.substring(0, 30) + '...') ||
                    contentTitle;
            }
        } catch (e) {
            contentTitle = `Content ID: ${payment.content_id}`;
        }

        return Response.json({
            success: true,
            message: `Payment ${action}d successfully`,
            data: {
                paymentId: paymentId,
                action: action,
                userName: payment.user_name,
                userEmail: payment.user_email,
                contentTitle: contentTitle,
                amount: payment.amount,
                processedBy: session.user.user_name || session.user.name,
            },
        });
    } catch (error) {
        console.error('Payment processing error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return Response.json(
                { error: 'Permission already exists for this user and content' },
                { status: 409 }
            );
        }

        return Response.json(
            { error: 'Internal server error during payment processing' },
            { status: 500 }
        );
    }
}
