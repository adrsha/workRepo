import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { marked } from 'marked';
import { NextResponse } from 'next/server';

// GET - Fetch content for a specific notice
export async function GET(request, { params }) {
    const { noticeId } = await params;
    
    try {
        const noticeContent = await executeQueryWithRetry({
            query: `
                SELECT 
                    n.notice_id,
                    n.notice_title,
                    n.notice_date_time,
                    c.content_id,
                    c.content_type,
                    c.content_data,
                    c.created_at
                FROM notices n
                LEFT JOIN notices_content nc ON n.notice_id = nc.notice_id
                LEFT JOIN content c ON nc.content_id = c.content_id
                WHERE n.notice_id = ?
                ORDER BY c.created_at DESC
            `,
            values: [noticeId],
        });

        if (!noticeContent || noticeContent.length === 0) {
            return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        }

        return NextResponse.json(noticeContent);
    } catch (error) {
        console.error('Error fetching notice content:', error);
        return NextResponse.json({ error: 'Failed to fetch notice content' }, { status: 500 });
    }
}

// POST - Add new content to a notice
export async function POST(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges
    if (session.user.level < 1) {
        return NextResponse.json({ error: 'Only admins can add content' }, { status: 403 });
    }

    const { noticeId } = await params;

    try {
        const { content_type, content_data } = await request.json();

        if (!content_data) {
            return NextResponse.json({ error: 'Content data is required' }, { status: 400 });
        }

        const contentTypeToUse = content_type || 'text';

        // First, create the content
        const contentResult = await executeQueryWithRetry({
            query: `
                INSERT INTO content (content_type, content_data)
                VALUES (?, ?)
            `,
            values: [contentTypeToUse, content_data]
        });

        const newContentId = contentResult.insertId;

        // Then, create the connection in notices_content table
        await executeQueryWithRetry({
            query: `
                INSERT INTO notices_content (notice_id, content_id)
                VALUES (?, ?)
            `,
            values: [noticeId, newContentId]
        });

        // Get the newly created content with notice info
        const newContent = await executeQueryWithRetry({
            query: `
                SELECT 
                    n.notice_id,
                    n.notice_title,
                    n.notice_date_time,
                    c.content_id,
                    c.content_type,
                    c.content_data,
                    c.created_at
                FROM notices n
                JOIN notices_content nc ON n.notice_id = nc.notice_id
                JOIN content c ON nc.content_id = c.content_id
                WHERE c.content_id = ?
            `,
            values: [newContentId]
        });

        const responseContent = newContent[0];

        return NextResponse.json(responseContent);
    } catch (error) {
        console.error('Error adding content:', error);
        return NextResponse.json({ error: 'Failed to add content' }, { status: 500 });
    }
}

// PUT method removed - editing functionality disabled

// DELETE - Remove content from a notice
export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges
    if (session.user.level < 1) {
        return NextResponse.json({ error: 'Only admins can delete content' }, { status: 403 });
    }

    const { noticeId } = await params; // This gets noticeId from the URL path

    try {
        const { contentId } = await request.json(); // Get contentId from body

        if (!contentId) {
            return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
        }

        // Check if content exists and belongs to the notice
        const existingContent = await executeQueryWithRetry({
            query: `
                SELECT c.content_id
                FROM content c
                JOIN notices_content nc ON c.content_id = nc.content_id
                WHERE c.content_id = ? AND nc.notice_id = ?
            `,
            values: [contentId, noticeId]
        });

        if (!existingContent || existingContent.length === 0) {
            return NextResponse.json({ error: 'Content not found or does not belong to this notice' }, { status: 404 });
        }

        // Delete the connection first
        await executeQueryWithRetry({
            query: `DELETE FROM notices_content WHERE content_id = ? AND notice_id = ?`,
            values: [contentId, noticeId]
        });

        // Delete the content
        const contentResult = await executeQueryWithRetry({
            query: `DELETE FROM content WHERE content_id = ?`,
            values: [contentId]
        });

        if (contentResult.affectedRows === 0) {
            return NextResponse.json({ error: 'Content not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Content deleted successfully',
            affectedRows: contentResult.affectedRows
        });

    } catch (error) {
        console.error('Error deleting content:', error);
        return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
    }
}
