const createFormData = (classId, additionalData = {}) => {
    const formData = new FormData();
    formData.append('classId', classId);
    
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
        // Step 1: Upload file
        // const formData = createFormData(classId, { file });
        // 
        // const fileData = await makeRequest('/api/upload', {
        //     method: 'POST',
        //     headers: { Authorization: `Bearer ${accessToken}` },
        //     body: formData,
        // });
        //
        // // Step 2: Save file metadata to database
        // const payload = {
        //     contentType: 'file',
        //     contentData: fileData,
        //     classId,
        //     isPublic: is_public
        // };
        //
        // return makeRequest('/api/content/save', {
        //     method: 'POST',
        //     headers: { 
        //         Authorization: `Bearer ${accessToken}`,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(payload),
        // });
        // uploadedFileData comes from FileUpload component's upload result
        const payload = {
            contentType: 'file',
            contentData: file, // Already contains filePath, originalName, etc.
            classId,
            is_public
        };

        return makeRequest('/api/content/save', {
            method: 'POST',
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
