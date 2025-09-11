// /api/quizzes/[quizId]/questions/[questionId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '@/app/lib/db';

export async function DELETE(request, { params }) {
    try {
        // Session validation
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: 'Authentication required' }, 
                { status: 401 }
            );
        }

        // Permission check - only admins can delete
        if (session.user.level < 1) {
            return NextResponse.json(
                { error: 'Insufficient permissions' }, 
                { status: 403 }
            );
        }

        // Parameter validation
        const { quizId, questionId } = params;
        if (!quizId || isNaN(parseInt(quizId))) {
            return NextResponse.json(
                { error: 'Valid quiz ID required' }, 
                { status: 400 }
            );
        }

        if (!questionId || isNaN(parseInt(questionId))) {
            return NextResponse.json(
                { error: 'Valid question ID required' }, 
                { status: 400 }
            );
        }

        // Verify question exists and belongs to the quiz
        const questionCheck = await executeQueryWithRetry({
            query: `SELECT question_id, question_order 
                    FROM quiz_questions 
                    WHERE question_id = ? AND quiz_id = ?`,
            values: [questionId, quizId]
        });

        if (!questionCheck || questionCheck.length === 0) {
            return NextResponse.json(
                { error: 'Question not found' }, 
                { status: 404 }
            );
        }

        const deletedOrder = questionCheck[0].question_order;

        // Delete the question
        const deleteResult = await executeQueryWithRetry({
            query: `DELETE FROM quiz_questions 
                    WHERE question_id = ? AND quiz_id = ?`,
            values: [questionId, quizId]
        });

        if (deleteResult.affectedRows === 0) {
            throw new Error('Failed to delete question');
        }

        // Reorder remaining questions to close the gap
        await executeQueryWithRetry({
            query: `UPDATE quiz_questions 
                    SET question_order = question_order - 1 
                    WHERE quiz_id = ? AND question_order > ?`,
            values: [quizId, deletedOrder]
        });

        console.log(`Question ${questionId} deleted from quiz ${quizId}`);

        return NextResponse.json(
            { message: 'Question deleted successfully' }, 
            { status: 200 }
        );

    } catch (error) {
        console.error('Error deleting question:', {
            error:      error.message,
            stack:      error.stack,
            quizId:     params?.quizId,
            questionId: params?.questionId,
            userId:     session?.user?.id
        });

        return NextResponse.json(
            { error: 'Failed to delete question' }, 
            { status: 500 }
        );
    }
}
