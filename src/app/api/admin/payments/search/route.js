// app/api/admin/payments/search/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../../lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user || session.user.level < 1) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim() || '';
        const status = searchParams.get('status') || '';

        if (!query) {
            return NextResponse.json({ error: 'Search query required' }, { status: 400 });
        }

        let whereClause = `WHERE (
            u.user_name LIKE ? OR 
            u.user_email LIKE ? OR 
            cp.payment_id LIKE ? OR
            JSON_EXTRACT(c.content_data, '$.title') LIKE ?
        )`;
        
        let queryParams = [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`];

        if (status && status !== '') {
            whereClause += ' AND cp.status = ?';
            queryParams.push(status);
        }

        const searchQuery = `
            SELECT cp.payment_id, cp.user_id, cp.content_id, cp.entity_type, cp.entity_id,
                   cp.amount, cp.screenshot_path, cp.status, cp.created_at, cp.processed_at,
                   cp.processed_by, cp.admin_notes, u.user_name, u.user_email, u.contact,
                   c.content_data, c.content_type, pb.user_name as processed_by_name
            FROM content_payments cp
            JOIN users u ON cp.user_id = u.user_id
            LEFT JOIN content c ON cp.content_id = c.content_id
            LEFT JOIN users pb ON cp.processed_by = pb.user_id
            ${whereClause}
            ORDER BY cp.created_at DESC
        `;

        const payments = await executeQueryWithRetry({
            query: searchQuery,
            values: queryParams
        });

        return NextResponse.json({
            success: true,
            payments: payments || [],
            query: query,
            resultCount: payments?.length || 0
        });

    } catch (error) {
        console.error('Payment search error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
