export const noticeService = {
    async addTextContent(noticeId, contentForm, accessToken, userId) {
        
        const payload = {
            contentType: 'text',
            contentData: { text: contentForm.content_data },
            noticeId,
            isPublic: contentForm.is_public || false
        };
        
        return fetch('/api/noticeContent/save', {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });
    },
    
    async uploadFile(noticeId, file, is_public, accessToken) {
        const payload = {
            contentType: 'file',
            contentData: file, // Already contains filePath, originalName, etc.
            noticeId,
            isPublic: is_public
        };
        
        return fetch('/api/noticeContent/save', {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });
    }
};
