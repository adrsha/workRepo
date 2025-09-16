// /api/gameContent/[gameId]/route.js
import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
    const { gameId } = await params;
    try {
        const gameContent = await executeQueryWithRetry({
            query: `
                SELECT 
                    g.game_id,
                    g.game_title,
                    g.game_date_time,
                    c.content_id,
                    c.content_type,
                    c.content_data,
                    c.created_at
                FROM games g
                LEFT JOIN game_content gc ON g.game_id = gc.game_id
                LEFT JOIN content c ON gc.content_id = c.content_id
                WHERE g.game_id = ?
                ORDER BY c.created_at DESC
            `,
            values: [gameId],
        });

        if (!gameContent || gameContent.length === 0) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        return NextResponse.json(gameContent);
    } catch (error) {
        console.error('Error fetching game content:', error);
        return NextResponse.json({ error: 'Failed to fetch game content' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;

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
                JOIN game_content gc ON c.content_id = gc.content_id
                WHERE c.content_id = ? AND gc.game_id = ?
            `,
            values: [contentId, gameId]
        });

        if (!contentData || contentData.length === 0) {
            return NextResponse.json({ 
                error: 'Content not found or does not belong to this game' 
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
            query:  `DELETE FROM game_content WHERE content_id = ? AND game_id = ?`,
            values: [contentId, gameId]
        });

        // Delete the content from database
        const contentResult = await executeQueryWithRetry({
            query:  `DELETE FROM content WHERE content_id = ?`,
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
            success:      true,
            message:      'Content and associated file deleted successfully',
            affectedRows: contentResult.affectedRows
        });

    } catch (error) {
        console.error('Error deleting content:', error);
        return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
    }
}
