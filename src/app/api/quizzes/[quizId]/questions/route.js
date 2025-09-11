// /api/quizzes/[quizId]/questions/route.js  
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '@/app/lib/db';

export async function POST(request, { params }) {
    try {
        // Session validation
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: 'Authentication required' }, 
                { status: 401 }
            );
        }

        if (session.user.level < 1) {
            return NextResponse.json(
                { error: 'Insufficient permissions' }, 
                { status: 403 }
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

        // Request body validation
        const body = await request.json();
        const { question_text, correct_answer } = body;
        
        if (!question_text?.trim()) {
            return NextResponse.json(
                { error: 'Question text is required' }, 
                { status: 400 }
            );
        }

        if (!correct_answer?.trim()) {
            return NextResponse.json(
                { error: 'Correct answer is required' }, 
                { status: 400 }
            );
        }

        // Get next question order
        const orderResult = await executeQueryWithRetry({
            query: `SELECT COALESCE(MAX(question_order), 0) + 1 as next_order 
                    FROM quiz_questions 
                    WHERE quiz_id = ?`,
            values: [quizId]
        });

        if (!orderResult || orderResult.length === 0) {
            throw new Error('Failed to determine question order');
        }

        // Insert new question
        const insertResult = await executeQueryWithRetry({
            query: `INSERT INTO quiz_questions 
                    (quiz_id, question_text, correct_answer, question_order) 
                    VALUES (?, ?, ?, ?)`,
            values: [
                quizId, 
                question_text.trim(), 
                correct_answer.trim(), 
                orderResult[0].next_order
            ]
        });

        if (!insertResult?.insertId) {
            throw new Error('Failed to create question');
        }

        console.log(`Question created with ID: ${insertResult.insertId}`);

        return NextResponse.json(
            { 
                question_id: insertResult.insertId,
                message:     'Question added successfully'
            }, 
            { status: 201 }
        );

    } catch (error) {
        console.error('Error adding question:', {
            error:   error.message,
            stack:   error.stack,
            quizId:  params?.quizId,
            userId:  session?.user?.id
        });

        return NextResponse.json(
            { error: 'Failed to add question' }, 
            { status: 500 }
        );
    }
}
