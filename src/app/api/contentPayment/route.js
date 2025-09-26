// app/api/contentPayment/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';
import path from 'path';
import fs from 'fs';
import { NextResponse } from 'next/server';

const uploadDir = './public/uploads/payment_screenshots';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        return await handlePaymentSubmission(request, session);
    } catch (error) {
        console.error('POST handler error:', error);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        return await handlePaymentStatusCheck(request, session);
    } catch (error) {
        console.error('GET handler error:', error);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}

async function handlePaymentSubmission(request, session) {
    try {
        const formData = await request.formData();
        
        const content_id  = formData.get('content_id');
        const entity_type = formData.get('entity_type');
        const entity_id   = formData.get('entity_id');
        const amount      = formData.get('amount');
        const screenshot  = formData.get('screenshot');

        // Validate required fields
        if (!content_id || !entity_type || !entity_id || !amount || !screenshot) {
            return NextResponse.json({ 
                error: 'Missing required fields: content_id, entity_type, entity_id, amount, screenshot' 
            }, { status: 400 });
        }

        // Validate file is actually a File object
        if (!(screenshot instanceof File)) {
            return NextResponse.json({ 
                error: 'Screenshot must be a valid file' 
            }, { status: 400 });
        }

        // Validate file type
        if (!screenshot.type.startsWith('image/')) {
            return NextResponse.json({ 
                error: 'File must be an image' 
            }, { status: 400 });
        }

        // Validate file size (5MB limit)
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (screenshot.size > MAX_FILE_SIZE) {
            return NextResponse.json({ 
                error: 'File size must be less than 5MB' 
            }, { status: 400 });
        }

        // Check if content exists and validate price
        const contentQuery = `
            SELECT c.content_id, COALESCE(qc.price, 0) as price
            FROM content c
            LEFT JOIN quiz_content qc ON c.content_id = qc.content_id
            WHERE c.content_id = ?
        `;
        
        const contentRows = await executeQueryWithRetry({
            query:  contentQuery,
            values: [content_id]
        });

        if (!contentRows?.length) {
            return NextResponse.json({ 
                error: 'Content not found' 
            }, { status: 404 });
        }

        const content      = contentRows[0];
        const contentPrice = parseFloat(content.price);
        const paymentAmount = parseFloat(amount);

        if (contentPrice !== paymentAmount) {
            return NextResponse.json({ 
                error: `Amount mismatch. Expected: ${contentPrice}, received: ${paymentAmount}` 
            }, { status: 400 });
        }

        // Check for existing pending/approved payments
        const existingPaymentQuery = `
            SELECT payment_id, status 
            FROM content_payments 
            WHERE user_id = ? AND content_id = ? AND status IN ('pending', 'approved')
        `;

        const existingPayments = await executeQueryWithRetry({
            query:  existingPaymentQuery,
            values: [session.user.id, content_id]
        });

        if (existingPayments?.length > 0) {
            return NextResponse.json({
                error:  'Payment already exists for this content',
                status: existingPayments[0].status
            }, { status: 409 }); // 409 Conflict
        }

        // Save the uploaded file
        const timestamp      = Date.now();
        const userId         = session.user.id;
        const fileExt        = path.extname(screenshot.name);
        const sanitizedName  = screenshot.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName       = `payment_${userId}_${timestamp}_${sanitizedName}`;
        const filePath       = path.join(uploadDir, fileName);
        
        // Convert file to buffer and save
        const arrayBuffer = await screenshot.arrayBuffer();
        const buffer      = Buffer.from(arrayBuffer);
        
        fs.writeFileSync(filePath, buffer);

        // Get relative path for database storage
        const screenshotPath = path.relative('./public', filePath);

        // Insert payment record
        const insertPaymentQuery = `
            INSERT INTO content_payments (
                user_id, content_id, entity_type, entity_id, amount, 
                screenshot_path, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
        `;

        const result = await executeQueryWithRetry({
            query: insertPaymentQuery,
            values: [
                session.user.id,
                content_id,
                entity_type,
                entity_id,
                paymentAmount,
                screenshotPath
            ]
        });

        return NextResponse.json({
            success:   true,
            message:   'Payment submitted successfully',
            status:    'pending',
            paymentId: result?.insertId,
            data: {
                payment_id:   result?.insertId,
                content_id:   content_id,
                amount:       paymentAmount,
                status:       'pending',
                submitted_at: new Date().toISOString()
            }
        }, { status: 201 }); // 201 Created

    } catch (error) {
        console.error('Payment submission error:', error);
        
        // More specific error handling
        if (error.code === 'ENOENT') {
            return NextResponse.json({
                error: 'Upload directory not accessible'
            }, { status: 500 });
        }
        
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({
                error: 'Duplicate payment detected'
            }, { status: 409 });
        }

        return NextResponse.json({
            error: 'Internal server error during payment submission'
        }, { status: 500 });
    }
}

async function handlePaymentStatusCheck(request, session) {
    try {
        const { searchParams } = new URL(request.url);
        const content_id = searchParams.get('content_id');

        if (!content_id) {
            return NextResponse.json({ error: 'content_id is required' }, { status: 400 });
        }

        const paymentQuery = `
            SELECT payment_id,
                   status,
                   amount,
                   created_at,
                   processed_at,
                   admin_notes
            FROM content_payments 
            WHERE user_id = ? AND content_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const paymentRows = await executeQueryWithRetry({
            query:  paymentQuery,
            values: [session.user.id, content_id]
        });

        if (!paymentRows || paymentRows.length === 0) {
            return NextResponse.json({
                hasPayment: false
            });
        }

        const payment = paymentRows[0];

        return NextResponse.json({
            hasPayment: true,
            payment: {
                payment_id:   payment.payment_id,
                status:       payment.status,
                amount:       payment.amount,
                created_at:   payment.created_at,
                processed_at: payment.processed_at,
                admin_notes:  payment.admin_notes
            }
        });

    } catch (error) {
        console.error('Payment status check error:', error);
        return NextResponse.json({
            error: 'Internal server error during status check'
        }, { status: 500 });
    }
}
