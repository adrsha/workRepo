// /api/quizzes/route.js
import { executeQueryWithRetry } from '../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const quizzes = await executeQueryWithRetry({
            query: `
                SELECT 
                *
                FROM quizzes
                ORDER BY quiz_date_time DESC
            `,
            values: [],
        });

        return NextResponse.json(quizzes);
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.level < 1) {
        return NextResponse.json({ error: 'Only admins can create quizzes' }, { status: 403 });
    }

    try {
        const { quiz_title, quiz_date_time } = await request.json();

        const quizDateTime = quiz_date_time || new Date().toISOString();

        const quizResult = await executeQueryWithRetry({
            query: `
                INSERT INTO quizzes (quiz_title, quiz_date_time)
                VALUES (?, ?)
            `,
            values: [quiz_title || null, quizDateTime]
        });

        const quizId = quizResult.insertId;

        const newQuiz = await executeQueryWithRetry({
            query: `
                SELECT 
                *
                FROM quizzes
                WHERE quiz_id = ?
            `,
            values: [quizId]
        });

        return NextResponse.json(newQuiz[0]);
    } catch (error) {
        console.error('Error creating quiz:', error);
        return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.level < 1) {
        return NextResponse.json({ error: 'Only admins can delete quizzes' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');

    if (!quizId) {
        return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
    }

    try {
        // Check if quiz has associated content
        const hasContent = await executeQueryWithRetry({
            query: `
                SELECT COUNT(*) as count
                FROM quiz_content qc
                WHERE qc.quiz_id = ?
            `,
            values: [quizId]
        });

        if (hasContent[0].count > 0) {
            return NextResponse.json({ 
                error: 'Cannot delete quiz with associated content. Delete content first.' 
            }, { status: 400 });
        }

        const quizResult = await executeQueryWithRetry({
            query: `DELETE FROM quizzes WHERE quiz_id = ?`,
            values: [quizId]
        });

        if (quizResult.affectedRows === 0) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Quiz deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting quiz:', error);
        return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }
}
