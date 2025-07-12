import { executeQueryWithRetry } from '../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const notices = await executeQueryWithRetry({
            query: `
                SELECT 
                    notices_id,
                    notice_title,
                    notice_date_time
                FROM notices
                ORDER BY notice_date_time DESC
            `,
            values: [],
        });

        return NextResponse.json(notices);
    } catch (error) {
        console.error('Error fetching notices:', error);
        return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.level < 1) {
        return NextResponse.json({ error: 'Only admins can create notices' }, { status: 403 });
    }

    try {
        const { notice_title, notice_date_time } = await request.json();

        // Use current timestamp if notice_date_time is not provided
        const noticeDateTime = notice_date_time || new Date().toISOString();

        // Create notice only (no content)
        const noticeResult = await executeQueryWithRetry({
            query: `
                INSERT INTO notices (notice_title, notice_date_time)
                VALUES (?, ?)
            `,
            values: [notice_title || null, noticeDateTime]
        });

        const noticeId = noticeResult.insertId;

        // Return the created notice
        const newNotice = await executeQueryWithRetry({
            query: `
                SELECT 
                    notices_id,
                    notice_title,
                    notice_date_time
                FROM notices
                WHERE notices_id = ?
            `,
            values: [noticeId]
        });

        return NextResponse.json(newNotice[0]);
    } catch (error) {
        console.error('Error creating notice:', error);
        return NextResponse.json({ error: 'Failed to create notice' }, { status: 500 });
    }
}

export async function PUT(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.level < 1) {
        return NextResponse.json({ error: 'Only admins can update notices' }, { status: 403 });
    }

    try {
        const { notice_title, notice_date_time } = await request.json();
        const { searchParams } = new URL(request.url);
        const noticeId = searchParams.get('noticeId');

        if (!noticeId) {
            return NextResponse.json({ error: 'Notice ID is required' }, { status: 400 });
        }

        // Get current notice info
        const currentNotice = await executeQueryWithRetry({
            query: `
                SELECT notices_id, notice_title, notice_date_time
                FROM notices
                WHERE notices_id = ?
            `,
            values: [noticeId]
        });

        if (!currentNotice || currentNotice.length === 0) {
            return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        }

        const noticeDateTime = notice_date_time || currentNotice[0].notice_date_time;
        const noticeTitleToUse = notice_title !== undefined ? notice_title : currentNotice[0].notice_title;

        // Update notice
        await executeQueryWithRetry({
            query: `
                UPDATE notices 
                SET notice_title = ?, notice_date_time = ?
                WHERE notices_id = ?
            `,
            values: [noticeTitleToUse, noticeDateTime, noticeId]
        });

        // Return the updated notice
        const updatedNotice = await executeQueryWithRetry({
            query: `
                SELECT 
                    notices_id,
                    notice_title,
                    notice_date_time
                FROM notices
                WHERE notices_id = ?
            `,
            values: [noticeId]
        });

        return NextResponse.json(updatedNotice[0]);
    } catch (error) {
        console.error('Error updating notice:', error);
        return NextResponse.json({ error: 'Failed to update notice' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.level < 1) {
        return NextResponse.json({ error: 'Only admins can delete notices' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const noticeId = searchParams.get('noticeId');

    if (!noticeId) {
        return NextResponse.json({ error: 'Notice ID is required' }, { status: 400 });
    }

    try {
        // Check if notice has associated content
        const hasContent = await executeQueryWithRetry({
            query: `
                SELECT COUNT(*) as count
                FROM notices_content nc
                WHERE nc.notices_id = ?
            `,
            values: [noticeId]
        });

        if (hasContent[0].count > 0) {
            return NextResponse.json({ 
                error: 'Cannot delete notice with associated content. Use the full notices-content API instead.' 
            }, { status: 400 });
        }

        // Delete the notice (only if no content is associated)
        const noticeResult = await executeQueryWithRetry({
            query: `DELETE FROM notices WHERE notices_id = ?`,
            values: [noticeId]
        });

        if (noticeResult.affectedRows === 0) {
            return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Notice deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting notice:', error);
        return NextResponse.json({ error: 'Failed to delete notice' }, { status: 500 });
    }
}
