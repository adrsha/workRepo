// app/api/quizService.js
export const quizService = {
    async createQuiz(quizTitle, accessToken) {
        const response = await fetch('/api/quizzes', {
            method:  'POST',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type':  'application/json'
            },
            body: JSON.stringify({ quiz_title: quizTitle })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create quiz');
        }
        
        return await response.json();
    },
    
    async addQuestion(quizId, questionText, correctAnswer, accessToken) {
        const response = await fetch(`/api/quizzes/${quizId}/questions`, {
            method:  'POST',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type':  'application/json'
            },
            body: JSON.stringify({ 
                question_text:  questionText, 
                correct_answer: correctAnswer 
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add question');
        }
        
        return await response.json();
    },

    async deleteQuestion(quizId, questionId, accessToken) {
        const response = await fetch(`/api/quizzes/${quizId}/questions/${questionId}`, {
            method:  'DELETE',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type':  'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete question');
        }
        
        return await response.json();
    },
    
    async submitQuiz(quizId, answers, accessToken) {
        const response = await fetch(`/api/quizzes/${quizId}/submit`, {
            method:  'POST',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type':  'application/json'
            },
            body: JSON.stringify({ answers })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit quiz');
        }
        
        return await response.json();
    },

    async getQuizAnswers(quizId, accessToken) {
        const response = await fetch(`/api/quizzes/${quizId}/answers`, {
            method:  'GET',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type':  'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch quiz answers');
        }
        
        return await response.json();
    },
    
    async getQuizAttemptStatus(quizId, accessToken) {
        const response = await fetch(`/api/quizzes/${quizId}/attempt-status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch quiz attempt status');
        }

        return await response.json();
    },
};
