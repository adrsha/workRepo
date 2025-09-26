// /api/quizzes/[quizId]/route.js
import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    const { quizId } = await params;

    try {
        const quizDetails = await executeQueryWithRetry({
            query: `
                SELECT
                    COUNT(qc.quiz_id) AS content_count,
                    SUM(CASE WHEN qc.price = 0 THEN 1 ELSE 0 END) AS free_count,
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
                FROM quiz_content AS qc
                JOIN content c ON qc.content_id = c.content_id
                WHERE qc.quiz_id = ?
            `,
            values: [user?.id || null, user?.id || null, quizId],
        });

        if (!quizDetails || quizDetails.length === 0) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }
        
        return NextResponse.json(quizDetails[0]);
    } catch (error) {
        console.error('Error fetching quiz content:', error);
        return NextResponse.json({ error: 'Failed to fetch quiz content' }, { status: 500 });
    }
}
