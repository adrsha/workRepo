const createFormData = (classId, isPublic, additionalData = {}) => {
    const formData = new FormData();
    formData.append('classId', classId);
    formData.append('isPublic', isPublic.toString());
    
    Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
    });
    
    return formData;
};

const makeRequest = async (url, options) => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    
    return response.json();
};

export const contentService = {
    async addTextContent(classId, contentForm, accessToken) {
        const formData = createFormData(classId, contentForm.isPublic, {
            textContent: contentForm.contentData
        });

        return makeRequest('/api/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
        });
    },

    async uploadFile(classId, file, isPublic, accessToken) {
        const formData = createFormData(classId, isPublic, { file });

        return makeRequest('/api/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
        });
    },

    async deleteContent(contentId, accessToken) {
        return makeRequest(`/api/classContent/${contentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    },

    async fetchClassContent(classId, accessToken) {
        return makeRequest(`/api/classContent/${classId}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    }
};
