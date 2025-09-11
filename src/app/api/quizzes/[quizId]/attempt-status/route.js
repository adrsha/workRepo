// /api/quizzes/[quizId]/attempt-status/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '@/app/lib/db';

export async function GET(request, { params }) {
    try {
        // Session validation
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: 'Authentication required' }, 
                { status: 401 }
            );
        }

        // Parameter validation
        const { quizId } = params;
        if (!quizId || isNaN(parseInt(quizId))) {
            return NextResponse.json(
                { error: 'Valid quiz ID required' }, 
                { status: 400 }
            );
        }

        // Check if quiz exists
        const quizResult = await executeQueryWithRetry({
            query: `SELECT * FROM quizzes WHERE quiz_id = ?`,
            values: [quizId]
        });

        if (!quizResult || quizResult.length === 0) {
            return NextResponse.json(
                { error: 'Quiz not found' }, 
                { status: 404 }
            );
        }

        // Check user's attempt
        const userAttempt = await executeQueryWithRetry({
            query: `SELECT attempt_id, score, submitted_at, answers 
                    FROM quiz_attempts 
                    WHERE quiz_id = ? AND user_id = ?
                    ORDER BY submitted_at DESC 
                    LIMIT 1`,
            values: [quizId, session.user.id]
        });

        // Get total questions count
        const questionsCount = await executeQueryWithRetry({
            query: `SELECT COUNT(*) as total FROM quiz_questions WHERE quiz_id = ?`,
            values: [quizId]
        });

        // Get quiz statistics
        const stats = await executeQueryWithRetry({
            query: `SELECT 
                        COUNT(*) as total_attempts,
                        AVG(score) as average_score
                    FROM quiz_attempts 
                    WHERE quiz_id = ?`,
            values: [quizId, quizId, quizId]
        });

        const totalQuestions = questionsCount[0]?.total || 0;
        const hasAttempted = userAttempt && userAttempt.length > 0;

        return NextResponse.json({
            quiz: {
                quiz_id: quizResult[0].quiz_id,
                quiz_title: quizResult[0].quiz_title,
                total_questions: totalQuestions
            },
            user_attempt: hasAttempted ? {
                attempt_id: userAttempt[0].attempt_id,
                score: userAttempt[0].score,
                total: totalQuestions,
                submitted_at: userAttempt[0].submitted_at,
                percentage: Math.round((userAttempt[0].score / totalQuestions) * 100)
            } : null,
            statistics: {
                total_attempts: stats[0]?.total_attempts || 0,
                average_score: Math.round((stats[0]?.average_score || 0) * 100) / 100,
            },
            has_attempted: hasAttempted
        });

    } catch (error) {
        console.error('Error fetching quiz attempt status:', {
            error: error.message,
            stack: error.stack,
            quizId: params?.quizId,
            userId: session?.user?.id
        });

        return NextResponse.json(
            { error: 'Failed to fetch quiz attempt status' }, 
            { status: 500 }
        );
    }
}
