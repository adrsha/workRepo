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
        console.log("Adding text content:", contentForm);
        
        const payload = {
            contentType: 'text',
            contentData: { text: contentForm.content_data },
            classId,
            isPublic: contentForm.is_public
        };

        return makeRequest('/api/saveContent', {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });
    },

    async uploadFile(classId, file, is_public, accessToken) {
        
        const payload = {
            contentType: 'file',
            contentData: file, // Already contains filePath, originalName, etc.
            classId,
            isPublic: is_public
        };

        return makeRequest('/api/saveContent', {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });
    },
    
    async toggleContentVisibility(contentId, accessToken) {
        const payload = {
            contentId
        };

        return makeRequest('/api/toggleVisibility', {
            method: 'PATCH',
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
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
