// ============== REFACTORED UPLOAD API ==============
// api/upload/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { CONFIG } from '../../../constants/config';
import { 
    generateFileName, 
    getPublicFilePath 
} from '../../../utils/contentUtils';

// Authentication Layer
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
            query: 'SELECT class_id FROM class WHERE class_id = ? AND teacher_id = ?',
            values: [classId, userId]
        });
        console.log("CLASS OWNER", classId, userId)
        return result.length > 0;
    }
};

// File System Layer
const fileService = {
    async createUploadDirectory(classId) {
        const serverDir = join(CONFIG.SERVER_UPLOADS_DIR, 'classes', classId);
        await mkdir(serverDir, { recursive: true });
        return serverDir;
    },

    async saveFile(buffer, filePath) {
        await writeFile(filePath, buffer);
    }
};

// Database Layer
const dbService = {
    async insertContent(contentType, content_data, is_public) {
        const result = await executeQueryWithRetry({
            query: 'INSERT INTO content (content_type, content_data, is_public) VALUES (?, ?, ?)',
            values: [contentType, content_data, is_public ? 1 : 0]
        });
        return result.insertId;
    },

    async linkContentToClass(classId, contentId) {
        await executeQueryWithRetry({
            query: 'INSERT INTO class_content (class_id, content_id) VALUES (?, ?)',
            values: [classId, contentId]
        });
    },

    async getContentById(contentId, classId) {
        const result = await executeQueryWithRetry({
            query: `
                SELECT c.content_id, c.content_type, c.content_data, c.created_at, c.is_public
                FROM content c
                JOIN class_content cc ON c.content_id = cc.content_id
                WHERE c.content_id = ? AND cc.class_id = ?
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

    parseContentData(content_data) {
        try {
            return JSON.parse(content_data);
        } catch (err) {
            console.error('Failed to parse content data:', err);
            return {};
        }
    },

    async saveContent(contentType, content_data, classId, is_public) {
        try {
            const contentId = await this.insertContent(contentType, JSON.stringify(content_data), is_public);
            await this.linkContentToClass(classId, contentId);
            return await this.getContentById(contentId, classId);
        } catch (err) {
            console.error('Database operation failed:', err);
            throw new Error(CONFIG.ERRORS.DB_FAILED);
        }
    }
};

// Content Processing Layer
const contentProcessor = {
    createFileContentData(file, fileName, filePath, userId) {
        return {
            originalName: file.name,
            fileName,
            filePath,
            fileSize: file.size,
            fileType: file.type,
            uploadedBy: userId,
            isFile: true
        };
    },

    createTextContentData(text, userId) {
        return {
            text,
            uploadedBy: userId,
            isFile: false
        };
    },

    async processFileUpload(file, classId, userId, is_public) {
        const fileName = generateFileName(userId, file.name);
        const serverDir = await fileService.createUploadDirectory(classId);
        const serverPath = join(serverDir, fileName);
        const publicPath = getPublicFilePath(classId, fileName);

        const buffer = Buffer.from(await file.arrayBuffer());
        await fileService.saveFile(buffer, serverPath);

        const content_data = this.createFileContentData(file, fileName, publicPath, userId);
        return await dbService.saveContent('file', content_data, classId, is_public);
    },

    async processTextContent(text, classId, userId, is_public) {
        const content_data = this.createTextContentData(text, userId);
        return await dbService.saveContent('text', content_data, classId, is_public);
    }
};

// Request/Response Layer
const requestHandler = {
    validateRequest(formData) {
        const file = formData.get('file');
        const classId = formData.get('classId');
        const textContent = formData.get('textContent');
        const is_public = formData.get('is_public') === 'true';

        if (!classId) throw new Error(CONFIG.ERRORS.MISSING_CLASS_ID);
        if (!file && !textContent) throw new Error(CONFIG.ERRORS.MISSING_CONTENT);

        return { file, classId, textContent, is_public };
    },

    createResponse(data, status = 200) {
        return new Response(JSON.stringify(data), { 
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    },

    createErrorResponse(message, status) {
        return this.createResponse({ error: message }, status);
    },

    handleError(error) {
        console.error('Error processing upload:', error);

        const errorStatusMap = {
            [CONFIG.ERRORS.UNAUTHORIZED]: 401,
            [CONFIG.ERRORS.MISSING_CLASS_ID]: 400,
            [CONFIG.ERRORS.MISSING_CONTENT]: 400,
            [CONFIG.ERRORS.DB_FAILED]: 500
        };

        const status = errorStatusMap[error.message] || 500;
        const message = errorStatusMap[error.message] ? error.message : CONFIG.ERRORS.INTERNAL;

        return this.createErrorResponse(message, status);
    }
};

// Main Handler
export async function POST(req) {
    try {
        const user = await authService.getAuthenticatedUser();
        const formData = await req.formData();
        const { file, classId, textContent, is_public } = requestHandler.validateRequest(formData);
        
        // Check if user can upload - if they can upload, they can make it public
        const canUpload = await authService.canUserUpload(user.id, user.user_level, classId);
        
        if (!canUpload) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }

        const result = file && file instanceof File
            ? await contentProcessor.processFileUpload(file, classId, user.id, is_public)
            : await contentProcessor.processTextContent(textContent, classId, user.id, is_public);

        return requestHandler.createResponse(result);

    } catch (error) {
        return requestHandler.handleError(error);
    }
}
