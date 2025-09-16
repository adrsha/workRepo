// /api/quizContent/[quizId]/route.js
import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
    const { quizId } = await params;
    
    try {
        const quizContent = await executeQueryWithRetry({
            query: `
                SELECT 
                    q.quiz_id,
                    q.quiz_title,
                    q.quiz_date_time,
                    c.content_id,
                    c.content_type,
                    c.content_data,
                    c.created_at
                FROM quizzes q
                LEFT JOIN quiz_content qc ON q.quiz_id = qc.quiz_id
                LEFT JOIN content c ON qc.content_id = c.content_id
                WHERE q.quiz_id = ?
                ORDER BY c.created_at DESC
            `,
            values: [quizId],
        });

        if (!quizContent || quizContent.length === 0) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        return NextResponse.json(quizContent);
    } catch (error) {
        console.error('Error fetching quiz content:', error);
        return NextResponse.json({ error: 'Failed to fetch quiz content' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await params;

    try {
        const { contentId } = await request.json();

        if (!contentId) {
            return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
        }

        // Get content data including file path before deletion
        const contentData = await executeQueryWithRetry({
            query: `
                SELECT c.content_id, c.content_data
                FROM content c
                JOIN quiz_content qc ON c.content_id = qc.content_id
                WHERE c.content_id = ? AND qc.quiz_id = ?
            `,
            values: [contentId, quizId]
        });

        if (!contentData || contentData.length === 0) {
            return NextResponse.json({ 
                error: 'Content not found or does not belong to this quiz' 
            }, { status: 404 });
        }

        // Extract file path from content data
        let filePath = null;
        try {
            const parsedData = JSON.parse(contentData[0].content_data);
            filePath = parsedData?.filePath;
        } catch (parseError) {
            console.warn('Could not parse content_data for file path extraction:', parseError);
        }

        // Delete the connection first
        await executeQueryWithRetry({
            query: `DELETE FROM quiz_content WHERE content_id = ? AND quiz_id = ?`,
            values: [contentId, quizId]
        });

        // Delete the content from database
        const contentResult = await executeQueryWithRetry({
            query: `DELETE FROM content WHERE content_id = ?`,
            values: [contentId]
        });

        if (contentResult.affectedRows === 0) {
            return NextResponse.json({ 
                error: 'Content not found or already deleted' 
            }, { status: 404 });
        }

        // Delete the associated file if it exists
        if (filePath) {
            try {
                const fullPath = path.join(process.cwd(), 'public', filePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log('File deleted successfully:', filePath);
                } else {
                    console.warn('File not found on filesystem:', filePath);
                }
            } catch (fileError) {
                console.error('Error deleting file:', fileError);
                // Continue with success response even if file deletion fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Content and associated file deleted successfully',
            affectedRows: contentResult.affectedRows
        });

    } catch (error) {
        console.error('Error deleting content:', error);
        return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
    }
}
