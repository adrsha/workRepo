// /api/quizzes/[quizId]/answers/route.js
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

        // Permission check - only admins can view answers
        // if (session.user.level < 1) {
        //     return NextResponse.json(
        //         { error: 'Insufficient permissions' }, 
        //         { status: 403 }
        //     );
        // }

        // Parameter validation
        const { quizId } = params;
        if (!quizId || isNaN(parseInt(quizId))) {
            return NextResponse.json(
                { error: 'Valid quiz ID required' }, 
                { status: 400 }
            );
        }

        // Get quiz details
        const quizResult = await executeQueryWithRetry({
            query: `SELECT *
                    FROM quizzes 
                    WHERE quiz_id = ?`,
            values: [quizId]
        });

        if (!quizResult || quizResult.length === 0) {
            return NextResponse.json(
                { error: 'Quiz not found' }, 
                { status: 404 }
            );
        }

        // Get all quiz attempts with user details
        const attemptsResult = await executeQueryWithRetry({
            query: `SELECT 
                        qa.attempt_id,
                        qa.user_id,
                        u.user_name,
                        u.user_email,
                        qa.score,
                        qa.answers,
                        qa.submitted_at
                    FROM quiz_attempts qa
                    JOIN users u ON qa.user_id = u.user_id
                    WHERE qa.quiz_id = ?
                    ORDER BY qa.submitted_at DESC`,
            values: [quizId]
        });

        // Get quiz questions for reference
        const questionsResult = await executeQueryWithRetry({
            query: `SELECT 
                        question_id,
                        question_text,
                        correct_answer,
                        question_order
                    FROM quiz_questions 
                    WHERE quiz_id = ?
                    ORDER BY question_order`,
            values: [quizId]
        });

        // Parse answers JSON and add question details
        const attempts = attemptsResult.map(attempt => {
            let parsedAnswers = {};
            try {
                parsedAnswers = JSON.parse(attempt.answers);
            } catch (e) {
                console.error('Error parsing answers JSON:', e);
            }

            return {
                attempt_id:   attempt.attempt_id,
                user_id:      attempt.user_id,
                username:     attempt.username,
                email:        attempt.email,
                score:        attempt.score,
                submitted_at: attempt.submitted_at,
                answers:      parsedAnswers
            };
        });

        const totalQuestions = questionsResult.length;
        const totalAttempts  = attempts.length;
        const averageScore   = attempts.length > 0 
            ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length 
            : 0;

        return NextResponse.json({
            quiz:      quizResult[0],
            questions: questionsResult,
            attempts:  attempts,
            statistics: {
                total_questions: totalQuestions,
                total_attempts:  totalAttempts,
                average_score:   Math.round(averageScore * 100) / 100
            }
        });

    } catch (error) {
        console.error('Error fetching quiz answers:', {
            error:  error.message,
            stack:  error.stack,
            quizId: params?.quizId,
            userId: session?.user?.id
        });

        return NextResponse.json(
            { error: 'Failed to fetch quiz answers' }, 
            { status: 500 }
        );
    }
}
