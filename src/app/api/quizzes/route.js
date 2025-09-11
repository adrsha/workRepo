// /api/quizzes/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '@/app/lib/db';

export async function GET() {
    try {
        // Session validation
        const session = await getServerSession(authOptions);
 
        if (!session) {
            return NextResponse.json(
                { error: 'Authentication required' }, 
                { status: 401 }
            );
        }

        // Fetch active quizzes with creator information
        const quizzes = await executeQueryWithRetry({
            query: `SELECT q.*, u.user_name as creator_name, COUNT(qq.question_id) as question_count
                    FROM quizzes q 
                    LEFT JOIN users u ON q.created_by = u.user_id
                    LEFT JOIN quiz_questions qq ON q.quiz_id = qq.quiz_id
                    ORDER BY q.created_at DESC`,
            values: []
        });
        
        if (!quizzes) {
            throw new Error('Failed to retrieve quizzes');
        }
        if ((quizzes?.length === 1 && !quizzes[0].quiz_id) || quizzes.length === 0) {
            return NextResponse.json(
                [],
                { status: 200 }
            );
        }
        
        return NextResponse.json(
            quizzes,
            { status: 200 }
        );

    } catch (error) {
        console.error('Error fetching quizzes:', {
            error:  error.message,
            stack:  error.stack,
            userId: session?.user?.id
        });

        return NextResponse.json(
            { error: 'Failed to fetch quizzes' }, 
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        // Session validation
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: 'Authentication required' }, 
                { status: 401 }
            );
        }
        
        // Authorization check - only teachers and admins can create quizzes
        if (session.user.level < 1) {
            return NextResponse.json(
                { error: 'Insufficient permissions' }, 
                { status: 403 }
            );
        }
        
        // Request body validation
        const body = await request.json();
        const { quiz_title } = body;
        
        if (!quiz_title?.trim()) {
            return NextResponse.json(
                { error: 'Quiz title is required' }, 
                { status: 400 }
            );
        }

        // Check for duplicate quiz titles by same user (optional business rule)
        const existingQuiz = await executeQueryWithRetry({
            query: `SELECT quiz_id 
                    FROM quizzes 
                    WHERE quiz_title = ? AND created_by = ? AND is_active = true`,
            values: [quiz_title.trim(), session.user.id]
        });

        if (existingQuiz && existingQuiz.length > 0) {
            return NextResponse.json(
                { error: 'Quiz with this title already exists' }, 
                { status: 409 }
            );
        }
        
        // Create new quiz
        const result = await executeQueryWithRetry({
            query: `INSERT INTO quizzes (quiz_title, created_by, is_active, created_at) 
                    VALUES (?, ?, true, NOW())`,
            values: [quiz_title.trim(), session.user.id]
        });

        if (!result?.insertId) {
            throw new Error('Failed to create quiz');
        }

        console.log(`Quiz created with ID: ${result.insertId}`);
        
        return NextResponse.json(
            { 
                quiz_id:    result.insertId, 
                quiz_title: quiz_title.trim(), 
                created_by: session.user.id,
                message:    'Quiz created successfully'
            }, 
            { status: 201 }
        );

    } catch (error) {
        console.error('Error creating quiz:', {
            error:     error.message,
            stack:     error.stack,
            userId:    session?.user?.id,
            quizTitle: request?.json?.()?.quiz_title
        });

        return NextResponse.json(
            { error: 'Failed to create quiz' }, 
            { status: 500 }
        );
    }
}
