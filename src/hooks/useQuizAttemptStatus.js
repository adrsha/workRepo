// hooks/useQuizAttemptStatus.js
import { useState, useEffect, useCallback } from 'react';
import { quizService } from '../app/api/quizService';

export const useQuizAttemptStatus = (quizId, session) => {
    const [attemptStatus, setAttemptStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAttemptStatus = useCallback(async () => {
        if (!quizId || !session?.accessToken) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await quizService.getQuizAttemptStatus(quizId, session.accessToken);
            console.log("FETCHED", data)
            setAttemptStatus(data);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching quiz attempt status:', err);
        } finally {
            setLoading(false);
        }
    }, [quizId, session?.accessToken]);

    useEffect(() => {
        fetchAttemptStatus();
    }, [fetchAttemptStatus]);

    // Reset state when quizId changes
    useEffect(() => {
        setAttemptStatus(null);
        setError(null);
    }, [quizId]);

    return { 
        attemptStatus,
        loading, 
        error,
        refetch: fetchAttemptStatus
    };
};
