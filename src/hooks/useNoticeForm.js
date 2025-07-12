import { useState } from 'react';

export const useNoticeForm = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [noticeForm, setNoticeForm] = useState({
        notice_title: '',
        notice_data_time: '',
        contentType: 'text',
        content_data: ''
    });

    const updateForm = (field, value) => {
        setNoticeForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const resetForm = () => {
        setNoticeForm({
            notice_title: '',
            notice_data_time: '',
            contentType: 'text',
            content_data: ''
        });
        setIsEditing(false);
    };

    return {
        isEditing,
        setIsEditing,
        noticeForm,
        updateForm,
        resetForm
    };
};
