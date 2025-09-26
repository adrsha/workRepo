// app/api/admin/payments/stats/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../../lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user || session.user.level < 1) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const statsQuery = `
            SELECT 
                status,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM content_payments 
            GROUP BY status
        `;

        const stats = await executeQueryWithRetry({
            query: statsQuery,
            values: []
        });

        // Get recent activity (last 7 days)
        const recentActivityQuery = `
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM content_payments 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `;

        const recentActivity = await executeQueryWithRetry({
            query: recentActivityQuery,
            values: []
        });

        return NextResponse.json({
            success: true,
            stats: stats || [],
            recentActivity: recentActivity || []
        });

    } catch (error) {
        console.error('Payment stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
