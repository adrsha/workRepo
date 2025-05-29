export const validateTextContent = (contentForm) => {
    return contentForm.contentType === 'text' &&
        contentForm.contentData &&
        contentForm.contentData.trim().length > 0;
};

export const sortContentsByDate = (contents, order = 'asc') => {
    return [...contents].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
};

export const parseContentData = (contentData) => {
    if (typeof contentData === 'string' && contentData.trim().startsWith('{')) {
        try {
            return JSON.parse(contentData);
        } catch (err) {
            console.warn('Invalid JSON in content_data:', contentData);
            return {};
        }
    }
    return contentData;
};

export const generateFileName = (userId, originalName) => {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `${userId}_${timestamp}.${extension}`;
};

export const getPublicFilePath = (classId, fileName) => {
    return `/uploads/classes/${classId}/${fileName}`;
};
