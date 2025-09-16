// /api/games/route.js
import { executeQueryWithRetry } from '../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const games = await executeQueryWithRetry({
            query: `
                SELECT 
                    game_id,
                    game_title,
                    game_date_time
                FROM games
                ORDER BY game_date_time DESC
            `,
            values: [],
        });

        return NextResponse.json(games);
    } catch (error) {
        console.error('Error fetching games:', error);
        return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.level < 1) {
        return NextResponse.json({ error: 'Only admins can create games' }, { status: 403 });
    }

    try {
        const { game_title, game_date_time } = await request.json();

        const gameDateTime = game_date_time || new Date().toISOString();

        const gameResult = await executeQueryWithRetry({
            query: `
                INSERT INTO games (game_title, game_date_time)
                VALUES (?, ?)
            `,
            values: [game_title || null, gameDateTime]
        });

        const gameId = gameResult.insertId;

        const newGame = await executeQueryWithRetry({
            query: `
                SELECT 
                    game_id,
                    game_title,
                    game_date_time
                FROM games
                WHERE game_id = ?
            `,
            values: [gameId]
        });

        return NextResponse.json(newGame[0]);
    } catch (error) {
        console.error('Error creating game:', error);
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.level < 1) {
        return NextResponse.json({ error: 'Only admins can delete games' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const gameId          = searchParams.get('gameId');

    if (!gameId) {
        return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    try {
        // Check if game has associated content
        const hasContent = await executeQueryWithRetry({
            query: `
                SELECT COUNT(*) as count
                FROM game_content gc
                WHERE gc.game_id = ?
            `,
            values: [gameId]
        });

        if (hasContent[0].count > 0) {
            return NextResponse.json({ 
                error: 'Cannot delete game with associated content. Delete content first.' 
            }, { status: 400 });
        }

        const gameResult = await executeQueryWithRetry({
            query: `DELETE FROM games WHERE game_id = ?`,
            values: [gameId]
        });

        if (gameResult.affectedRows === 0) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Game deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting game:', error);
        return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
    }
}
