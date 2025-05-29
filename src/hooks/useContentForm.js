import { useState } from 'react';
import { INITIAL_CONTENT_FORM } from '../constants/config';

export const useContentForm = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [contentForm, setContentForm] = useState(INITIAL_CONTENT_FORM);

    const updateForm = (field, value) => {
        setContentForm(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setIsEditing(false);
        setContentForm(INITIAL_CONTENT_FORM);
    };

    return {
        isEditing,
        setIsEditing,
        contentForm,
        updateForm,
        resetForm
    };
};
