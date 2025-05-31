export const validateTextContent = (contentForm) => {
    return contentForm.content_type === 'text' &&
        contentForm.content_data &&
        contentForm.content_data.trim().length > 0;
};

export const sortContentsByDate = (contents, order = 'asc') => {
    return [...contents].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
};

export const parseContentData = (content_data) => {
    if (typeof content_data === 'string' && content_data.trim().startsWith('{')) {
        try {
            return JSON.parse(content_data);
        } catch (err) {
            console.warn('Invalid JSON in content_data:', content_data);
            return {};
        }
    }
    return content_data;
};

export const generateFileName = (userId, originalName) => {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `${userId}_${timestamp}.${extension}`;
};

export const getPublicFilePath = (classId, fileName) => {
    return `/uploads/classes/${classId}/${fileName}`;
};
