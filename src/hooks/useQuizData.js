// hooks/useQuizData.js
import { useState, useEffect, useCallback } from 'react';

export const useQuizzesData = (session) => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const fetchQuizzes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/quizzes', {
                headers: {
                    ...(session?.accessToken && { 'Authorization': `Bearer ${session.accessToken}` })
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch quizzes');
            }
            
            const data = await response.json();
            console.log("Data from API:", data);
            setQuizzes(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);
    
    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);
    
    return { quizzes, setQuizzes, loading, error, refetch: fetchQuizzes };
};

export const useQuizData = (quizId) => {
    const [quizDetails, setQuizDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const fetchQuiz = useCallback(async () => {
        if (!quizId) {
            setQuizDetails(null);
            setLoading(false);
            setError(null);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching quiz with ID:', quizId); // Debug log
            
            const response = await fetch(`/api/quizzes/${quizId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch quiz');
            }
            
            const data = await response.json();
            console.log('Quiz API response:', data); // Debug log
            
            // Handle different possible response structures
            if (data && data.quiz) {
                // If response has a quiz property
                setQuizDetails(data);
            } else if (data && data.quiz_id) {
                // If response is the quiz object directly
                setQuizDetails({ quiz: data });
            } else {
                console.warn('Unexpected API response structure:', data);
                setQuizDetails(null);
            }
        } catch (err) {
            console.error('Error fetching quiz:', err);
            setError(err.message);
            setQuizDetails(null);
        } finally {
            setLoading(false);
        }
    }, [quizId]);
    
    // Reset state when quizId changes
    useEffect(() => {
        if (quizId) {
            setQuizDetails(null);
            setError(null);
        }
    }, [quizId]);
    
    useEffect(() => {
        fetchQuiz();
    }, [fetchQuiz]);
 
    return { quizDetails, setQuizDetails, loading, error, refetch: fetchQuiz };
};
