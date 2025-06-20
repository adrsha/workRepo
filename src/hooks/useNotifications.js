import { useState } from 'react';

export const useNotifications = () => {
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const showSuccess = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(null), 3000);
    };

    const showError = (message) => {
        setError(message);
    };

    const clearNotifications = () => {
        setError(null);
        setSuccess(null);
    };

    return { 
        error, 
        success, 
        showSuccess, 
        showError, 
        setError, 
        setSuccess,
        clearNotifications
    };
};
