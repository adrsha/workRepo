// /api/games/[gameId]/route.js - Updated with new permission system
import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    const { gameId } = await params;

    try {
        const gameDetails = await executeQueryWithRetry({
            query: `
                SELECT
                    COUNT(gc.game_id) AS content_count,
                    SUM(CASE WHEN gc.price = 0 THEN 1 ELSE 0 END) AS free_count,
                    SUM(
                        CASE 
                            WHEN c.is_public = 1 THEN 1
                            WHEN ? IS NULL THEN 0
                            WHEN EXISTS (
                                SELECT 1 FROM content_user_permissions cup 
                                WHERE cup.content_id = c.content_id AND cup.user_id = ?
                            ) THEN 1
                            ELSE 0
                        END
                    ) AS owned_count
                FROM game_content AS gc
                JOIN content c ON gc.content_id = c.content_id
                WHERE gc.game_id = ?
            `,
            values: [user?.id || null, user?.id || null, gameId],
        });

        if (!gameDetails || gameDetails.length === 0) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }
        
        return NextResponse.json(gameDetails[0]);
    } catch (error) {
        console.error('Error fetching game content:', error);
        return NextResponse.json({ error: 'Failed to fetch game content' }, { status: 500 });
    }
}
