import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';
import { CONFIG } from '../../../constants/config';

const authService = {
    async getAuthenticatedUser() {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        return session.user;
    },

    async canUserUpload(userId, userLevel, classId) {
        if (userLevel === CONFIG.USER_LEVELS.ADMIN) return true;
        if (userLevel === CONFIG.USER_LEVELS.TEACHER) {
            return await this.isClassOwner(userId, classId);
        }
        return false;
    },

    async isClassOwner(userId, classId) {
        const result = await executeQueryWithRetry({
            query: 'SELECT class_id FROM classes WHERE class_id = ? AND teacher_id = ?',
            values: [classId, userId]
        });
        return result.length > 0;
    }
};

const dbService = {
    async insertContent(contentType, contentData, isPublic) {
        const result = await executeQueryWithRetry({
            query: 'INSERT INTO content (content_type, content_data, is_public) VALUES (?, ?, ?)',
            values: [contentType, contentData, isPublic ? 1 : 0]
        });
        return result.insertId;
    },

    async linkContentToClass(classId, contentId) {
        await executeQueryWithRetry({
            query: 'INSERT INTO classes_content (classes_id, content_id) VALUES (?, ?)',
            values: [classId, contentId]
        });
    },

    async getContentById(contentId, classId) {
        const result = await executeQueryWithRetry({
            query: `
                SELECT c.content_id, c.content_type, c.content_data, c.created_at, c.is_public
                FROM content c
                JOIN classes_content cc ON c.content_id = cc.content_id
                WHERE c.content_id = ? AND cc.classes_id = ?
            `,
            values: [contentId, classId]
        });

        if (!result.length) return null;

        const record = result[0];
        const parsedData = this.parseContentData(record.content_data);

        return {
            content_id: record.content_id,
            content_type: record.content_type,
            created_at: record.created_at,
            is_public: record.is_public,
            ...parsedData
        };
    },

    parseContentData(contentData) {
        try {
            return JSON.parse(contentData);
        } catch (err) {
            console.error('Failed to parse content data:', err);
            return {};
        }
    },

    async saveContent(contentType, contentData, classId, isPublic) {
        try {
            const contentId = await this.insertContent(contentType, JSON.stringify(contentData), isPublic);
            await this.linkContentToClass(classId, contentId);
            return await this.getContentById(contentId, classId);
        } catch (err) {
            console.error('Database operation failed:', err);
            throw new Error(CONFIG.ERRORS.DB_FAILED);
        }
    }
};

const contentProcessor = {
    createFileContent(fileData, isPublic) {
        return {
            type: 'file',
            data: { ...fileData, isFile: true },
            isPublic
        };
    },

    createTextContent(text, userId, isPublic) {
        return {
            type: 'text',
            data: { text, uploadedBy: userId, isFile: false },
            isPublic
        };
    }
};

const requestHandler = {
    validateRequest(body) {
        const { contentType, contentData, classId, isPublic = false } = body;

        if (!classId) throw new Error(CONFIG.ERRORS.MISSING_CLASS_ID);
        if (!contentType || !contentData) throw new Error(CONFIG.ERRORS.MISSING_CONTENT);

        return { contentType, contentData, classId, isPublic };
    },

    createResponse(data, status = 200) {
        return new Response(JSON.stringify(data), { 
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    },

    handleError(error) {
        console.error('Content save error:', error);

        const errorStatusMap = {
            [CONFIG.ERRORS.UNAUTHORIZED]: 401,
            [CONFIG.ERRORS.MISSING_CLASS_ID]: 400,
            [CONFIG.ERRORS.MISSING_CONTENT]: 400,
            [CONFIG.ERRORS.DB_FAILED]: 500
        };

        const status = errorStatusMap[error.message] || 500;
        const message = errorStatusMap[error.message] ? error.message : CONFIG.ERRORS.INTERNAL;

        return this.createResponse({ error: message }, status);
    }
};

export async function POST(req) {
    try {
        const user = await authService.getAuthenticatedUser();
        const body = await req.json();
        const { contentType, contentData, classId, isPublic } = requestHandler.validateRequest(body);

        const canUpload = await authService.canUserUpload(user.id, user.level, classId);
        if (!canUpload) throw new Error(CONFIG.ERRORS.UNAUTHORIZED);

        let content;
        if (contentType === 'file') {
            content = contentProcessor.createFileContent(contentData, isPublic);
        } else {
            content = contentProcessor.createTextContent(contentData.text, user.id, isPublic);
        }

        const result = await dbService.saveContent(content.type, content.data, classId, content.isPublic);
        
        return requestHandler.createResponse(result);
    } catch (error) {
        return requestHandler.handleError(error);
    }
}
