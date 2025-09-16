// hooks/useAboutUs.js
import { useState } from 'react';

export const useAboutUsHandlers = (initialData, setAboutData) => {
    const [isEditing, setIsEditing] = useState(false);
    const [contentForm, setContentForm] = useState({
        content_type: 'text',
        content_data: initialData?.content?.[0]?.content_value || '',
        is_public: true
    });

    const handleUpdateForm = (field, value) => {
        setContentForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveContent = async () => {
        try {
            const response = await fetch('/api/about', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: contentForm.content_data
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update content');
            }

            const result = await response.json();
            console.log('Content updated:', result);
            
            // Refresh the data
            const updatedData = await fetchAboutContent();
            setAboutData(updatedData);
            setIsEditing(false);
            
            return result;
        } catch (error) {
            console.error('Error saving content:', error);
            alert('Failed to save content');
            throw error;
        }
    };

    const handleCancel = () => {
        // Reset form to original data
        setContentForm(prev => ({
            ...prev,
            content_data: initialData?.content?.[0]?.content_value || ''
        }));
        setIsEditing(false);
    };

    const handleStartEditing = () => {
        // Update form with latest data when starting to edit
        setContentForm(prev => ({
            ...prev,
            content_data: initialData?.content?.[0]?.content_value || ''
        }));
        setIsEditing(true);
    };

    return {
        isEditing,
        contentForm,
        handleUpdateForm,
        handleSaveContent,
        handleCancel,
        handleStartEditing,
        setIsEditing
    };
};

// API helper functions
export async function fetchAboutContent() {
    try {
        const response = await fetch('/api/about', {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch about content');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching about content:', error);
        throw error;
    }
}

export async function saveAboutContent(content) {
    try {
        const response = await fetch('/api/about', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        });

        if (!response.ok) {
            throw new Error('Failed to update about content');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error updating about content:', error);
        throw error;
    }
}
