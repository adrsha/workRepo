// app/api/admin/payments/bulk/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../../lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user || session.user.level < 1) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { paymentIds, action, adminNotes } = await request.json();

        if (!Array.isArray(paymentIds) || !action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const results = [];
        
        for (const paymentId of paymentIds) {
            try {
                // Get payment details
                const paymentQuery = `
                    SELECT cp.payment_id, cp.user_id, cp.content_id, cp.entity_type, 
                           cp.entity_id, cp.amount, cp.status, u.user_name, u.user_email
                    FROM content_payments cp
                    JOIN users u ON cp.user_id = u.user_id
                    WHERE cp.payment_id = ? AND cp.status = 'pending'
                `;

                const paymentResult = await executeQueryWithRetry({
                    query: paymentQuery,
                    values: [paymentId]
                });

                if (!paymentResult?.length) {
                    results.push({ paymentId, status: 'error', error: 'Payment not found or already processed' });
                    continue;
                }

                const payment = paymentResult[0];

                // Update payment status
                const updatePaymentQuery = `
                    UPDATE content_payments 
                    SET status = ?, processed_at = NOW(), processed_by = ?, admin_notes = ?
                    WHERE payment_id = ?
                `;

                await executeQueryWithRetry({
                    query: updatePaymentQuery,
                    values: [action === 'approve' ? 'approved' : 'rejected', session.user.id, adminNotes || null, paymentId]
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
                        values: [payment.user_id, payment.content_id, payment.entity_type, payment.entity_id]
                    });

                    if (!existingPermission?.length) {
                        const grantPermissionQuery = `
                            INSERT INTO content_user_permissions 
                            (user_id, content_id, entity_type, entity_id, granted_by, granted_at) 
                            VALUES (?, ?, ?, ?, ?, NOW())
                        `;

                        await executeQueryWithRetry({
                            query: grantPermissionQuery,
                            values: [payment.user_id, payment.content_id, payment.entity_type, payment.entity_id, session.user.id]
                        });
                    }
                }

                // Send notification
                const notificationMessage = action === 'approve'
                    ? `Your payment of Rs. ${parseFloat(payment.amount).toFixed(2)} has been approved! You now have access to the content.`
                    : `Your payment of Rs. ${parseFloat(payment.amount).toFixed(2)} has been rejected. ${adminNotes ? 'Reason: ' + adminNotes : ''}`;

                const notificationQuery = `
                    INSERT INTO notifs 
                    (user_id, message, read_status, created_at, link, notif_type, meta_id) 
                    VALUES (?, ?, 0, NOW(), ?, ?, ?)
                `;

                await executeQueryWithRetry({
                    query: notificationQuery,
                    values: [payment.user_id, notificationMessage, `/content/${payment.content_id}`, 'payment', paymentId]
                });

                results.push({ paymentId, status: 'success' });

            } catch (error) {
                console.error(`Error processing payment ${paymentId}:`, error);
                results.push({ paymentId, status: 'error', error: error.message });
            }
        }

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: paymentIds.length,
                successful: results.filter(r => r.status === 'success').length,
                failed: results.filter(r => r.status === 'error').length
            }
        });

    } catch (error) {
        console.error('Bulk processing error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
