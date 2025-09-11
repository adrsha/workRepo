// /api/quizzes/[quizId]/submit/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '@/app/lib/db';

export async function POST(request, { params }) {
    let session; // define here so we can access in catch block
    try {
        session = await getServerSession(authOptions);
        const { quizId } = params;
        
        if (!session) {
            return NextResponse.json(
                { error: 'Authentication required' }, 
                { status: 401 }
            );
        }

        // Parameter validation
        if (!quizId || isNaN(parseInt(quizId))) {
            return NextResponse.json(
                { error: 'Valid quiz ID required' }, 
                { status: 400 }
            );
        }
        
        const body = await request.json();
        const { answers } = body;
        
        if (!answers || typeof answers !== 'object') {
            return NextResponse.json(
                { error: 'Answers are required' }, 
                { status: 400 }
            );
        }

        // Check if quiz exists and is active
        const quizCheck = await executeQueryWithRetry({
            query: `SELECT quiz_id, quiz_title, is_active
                    FROM quizzes 
                    WHERE quiz_id = ?`,
            values: [quizId]
        });

        if (!quizCheck || quizCheck.length === 0) {
            return NextResponse.json(
                { error: 'Quiz not found' }, 
                { status: 404 }
            );
        }

        if (!quizCheck[0].is_active) {
            return NextResponse.json(
                { error: 'Quiz is not active' }, 
                { status: 400 }
            );
        }

        // Get all questions with correct answers
        const questions = await executeQueryWithRetry({
            query: `SELECT question_id, correct_answer
                    FROM quiz_questions 
                    WHERE quiz_id = ? 
                    ORDER BY question_order`,
            values: [quizId]
        });
        
        if (!questions || questions.length === 0) {
            return NextResponse.json(
                { error: 'No questions found for this quiz' }, 
                { status: 400 }
            );
        }

        // Calculate score
        let score = 0;
        const results = {};
        
        questions.forEach(q => {
            const userAnswer    = answers[q.question_id]?.toString().trim().toLowerCase() || '';
            const correctAnswer = q.correct_answer.toString().trim().toLowerCase();
            const isCorrect     = userAnswer === correctAnswer;
            
            if (isCorrect) score++;
            
            results[q.question_id] = {
                user_answer:    answers[q.question_id] || '',
                correct_answer: q.correct_answer,
                is_correct:     isCorrect
            };
        });
        
        // Save attempt (insert or update if already exists)
        const insertResult = await executeQueryWithRetry({
            query: `INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, submitted_at)
                    VALUES (?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                        answers = VALUES(answers),
                        score = VALUES(score),
                        submitted_at = NOW()`,
            values: [
                quizId, 
                session.user.id, 
                JSON.stringify(answers), 
                score
            ]
        });
        console.log("Insert result:", quizId, session.user.id, JSON.stringify(answers), score);
        // Get attempt ID (insertId might be 0 on update)
        let attemptId = insertResult.insertId;
        if (!attemptId) {
            const attemptRow = await executeQueryWithRetry({
                query: `SELECT attempt_id 
                        FROM quiz_attempts 
                        WHERE quiz_id = ? AND user_id = ?`,
                values: [quizId, session.user.id]
            });
            attemptId = attemptRow?.[0]?.attempt_id || null;
        }

        console.log(`Quiz attempt saved/updated: ${attemptId} for user ${session.user.id}`);
        
        return NextResponse.json({ 
            attempt_id: attemptId,
            score:      score, 
            total:      questions.length, 
            percentage: Math.round((score / questions.length) * 100),
            results:    results
        });

    } catch (error) {
        console.error('Error submitting quiz:', {
            error:  error.message,
            stack:  error.stack,
            quizId: params?.quizId,
            userId: session?.user?.id
        });

        return NextResponse.json(
            { error: 'Failed to submit quiz' }, 
            { status: 500 }
        );
    }
}
