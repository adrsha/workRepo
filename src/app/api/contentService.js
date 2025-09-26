//src/app/api/contentService.js
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
        const payload = {
            contentType: 'text',
            contentData: { text: contentForm.content_data },
            classId,
            isPublic: contentForm.is_public,
            price: contentForm.price || 0,
            authorizedUsers: contentForm.authorized_users || null
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

    async uploadFile(classId, file, isPublic, accessToken, authorizedUsers = null, price = 0) {
        const payload = {
            contentType: 'file',
            contentData: file, // Already contains filePath, originalName, etc.
            classId,
            isPublic,
            price: price || 0,
            authorizedUsers: authorizedUsers || null
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
    },

    // New method to assign content permissions
    async assignContentPermissions(contentId, userIds, entityType, entityId, accessToken) {
        const payload = {
            contentId,
            userIds,
            entityType,
            entityId
        };

        return makeRequest('/api/contentPermissions/assign', {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });
    },

    // New method to remove content permissions
    async removeContentPermissions(contentId, userIds, accessToken) {
        const payload = {
            contentId,
            userIds
        };

        return makeRequest('/api/contentPermissions/remove', {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });
    },

    // New method to fetch users for an entity
    async fetchEntityUsers(entityType, entityId, accessToken) {
        return makeRequest(`/api/${entityType}/${entityId}/users`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    }
};
