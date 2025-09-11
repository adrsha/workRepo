// hooks/useQuizForm.js  
import { useState } from 'react';

export const useQuizForm = () => {
    const [quizForm, setQuizForm] = useState({
        quiz_title: '',
        question_text: '',
        correct_answer: ''
    });

    const updateForm = (field, value) => {
        setQuizForm(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setQuizForm({
            quiz_title: '',
            question_text: '',
            correct_answer: ''
        });
    };

    return { quizForm, updateForm, resetForm };
};
