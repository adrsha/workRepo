// /api/about/route.js
import { executeQueryWithRetry } from '../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const aboutContent = await executeQueryWithRetry({
            query: `SELECT content_value FROM about_content`,
            values: [],
        });
        
        return NextResponse.json({
            content: aboutContent,
        });
    } catch (error) {
        console.error('Error fetching about content:', error);
        return NextResponse.json({ error: 'Failed to fetch about content' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.level < 2) {
        return NextResponse.json({ error: 'Only admins can edit about content' }, { status: 403 });
    }

    try {
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        // Since it's a single cell table, we'll use UPDATE or INSERT based on existence
        const existingContent = await executeQueryWithRetry({
            query: `SELECT content_value FROM about_content LIMIT 1`,
            values: []
        });

        let updatedContent;

        if (existingContent.length > 0) {
            // Update the single row
            updatedContent = await executeQueryWithRetry({
                query: `UPDATE about_content SET content_value = ?`,
                values: [content]
            });
        } else {
            // Insert first row
            updatedContent = await executeQueryWithRetry({
                query: `INSERT INTO about_content (content_value) VALUES (?)`,
                values: [content]
            });
        }

        // Fetch the updated content to return
        const refreshedContent = await executeQueryWithRetry({
            query: `SELECT content_value FROM about_content`,
            values: []
        });

        return NextResponse.json({
            success: true,
            message: 'About content updated successfully',
            content: refreshedContent,
        });

    } catch (error) {
        console.error('Error updating about content:', error);
        return NextResponse.json({ error: 'Failed to update about content' }, { status: 500 });
    }
}
