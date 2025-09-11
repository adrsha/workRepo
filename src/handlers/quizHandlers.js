// handlers/quizHandlers.js
import { quizService } from '../app/api/quizService';

export const createQuizHandlers = (session, setQuizzes, notifications, refetch) => {
    const handleCreateQuiz = async (quizTitle) => {
        if (!quizTitle.trim()) {
            notifications.setError('Quiz title is required');
            return;
        }

        try {
            const newQuiz = await quizService.createQuiz(quizTitle, session?.accessToken);
            setQuizzes(prev => [newQuiz, ...prev]);
            notifications.setSuccess('Quiz created successfully');
        } catch (error) {
            notifications.setError(error.message);
            throw error;
        }
    };

    const handleDeleteQuiz = async (quizId) => {
        if (!confirm('Are you sure you want to delete this quiz?')) {
            return;
        }

        try {
            const response = await fetch(`/api/quizzes/${quizId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.accessToken}` }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete quiz');
            }

            setQuizzes(prev => prev.filter(quiz => quiz.quiz_id !== quizId));
            notifications.setSuccess('Quiz deleted successfully');
        } catch (error) {
            notifications.setError(error.message);
            throw error;
        }
    };

    const handleAddQuestion = async (quizId, questionText, correctAnswer) => {
        if (!questionText.trim() || !correctAnswer.trim()) {
            notifications.setError('Question text and correct answer are required');
            return;
        }

        try {
            await quizService.addQuestion(quizId, questionText, correctAnswer, session?.accessToken);
            notifications.setSuccess('Question added successfully');
            if (refetch) refetch();
        } catch (error) {
            notifications.setError(error.message);
            throw error;
        }
    };

    const handleDeleteQuestion = async (quizId, questionId) => {
        if (!confirm('Are you sure you want to delete this question?')) {
            return;
        }

        try {
            await quizService.deleteQuestion(quizId, questionId, session?.accessToken);
            notifications.setSuccess('Question deleted successfully');
            if (refetch) refetch();
        } catch (error) {
            notifications.setError(error.message);
            throw error;
        }
    };

    const handleSubmitQuiz = async (quizId, answers) => {
        try {
            const result = await quizService.submitQuiz(quizId, answers, session?.accessToken);
            console.log("RESULT", result)
            notifications.setSuccess(`Quiz completed! Score: ${result.score}/${result.total}`);
            return result;
        } catch (error) {
            notifications.setError(error.message);
            throw error;
        }
    };

    const handleGetQuizAnswers = async (quizId) => {
        try {
            const result = await quizService.getQuizAnswers(quizId, session?.accessToken);
            return result;
        } catch (error) {
            notifications.setError(error.message);
            throw error;
        }
    };

    const handleGetAttemptStatus = async (quizId) => {
        try {
            const result = await quizService.getQuizAttemptStatus(quizId, session?.accessToken);
            return result;
        } catch (error) {
            notifications.setError(error.message);
            throw error;
        }
    };

    return {
        handleCreateQuiz,
        handleDeleteQuiz,
        handleAddQuestion,
        handleDeleteQuestion,
        handleSubmitQuiz,
        handleGetQuizAnswers,
        handleGetAttemptStatus
    };
};
