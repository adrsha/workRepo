// /api/quizzes/[quizId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { query } from '@/app/lib/db';

export async function GET(request, { params }) {
    try {
        const { quizId } = params;
 
        const quiz = await query(
            'SELECT * FROM quizzes WHERE quiz_id = ? AND is_active = true',
            [quizId]
        );

        if (quiz.length === 0) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        const questions = await query(
            'SELECT question_id, question_text, question_order FROM quiz_questions WHERE quiz_id = ? ORDER BY question_order',
            [quizId]
        );

        return NextResponse.json({ quiz: quiz[0], questions });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        const { quizId } = params;
        
        if (!session || session.user.level < 1) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        await query('DELETE FROM quizzes WHERE quiz_id = ?', [quizId]);
        return NextResponse.json({ message: 'Quiz deleted' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }
}
