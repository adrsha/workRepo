import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { CONFIG } from '../../../../constants/config';

// ============== AUTHENTICATION SERVICE ==============
const authService = {
    async getAuthenticatedUser() {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        return session.user;
    }
};

// ============== DATABASE SERVICE ==============
const dbService = {
    async getContentWithClass(contentId) {
        const query = `
            SELECT 
                c.content_id,
                c.content_type, 
                c.content_data, 
                c.is_public,
                cc.class_id
            FROM content c
            JOIN class_content cc ON c.content_id = cc.content_id
            WHERE c.content_id = ?
        `;

        const [rows] = await executeQueryWithRetry({ 
            query, 
            values: [contentId] 
        });

        return rows;
    },

    parseContentData(contentData) {
        try {
            const op = JSON.parse(contentData);
            return op;
        } catch (error) {
            throw new Error(CONFIG.ERRORS.INVALID_FILE_DATA);
        }
    }
};

// ============== FILE SERVICE ==============
const fileService = {
    async readFileFromDisk(classId, fileName) {
        try {
            const filePath = join(CONFIG.SERVER_UPLOADS_DIR, 'classes', classId, fileName);
            return await readFile(filePath);
        } catch (error) {
            console.error('Failed to read file from disk:', error);
            throw new Error(CONFIG.ERRORS.FILE_READ_FAILED);
        }
    }
};

// ============== VALIDATION SERVICE ==============
const validationService = {
    validateContentId(contentId) {
        if (!contentId) {
            throw new Error(CONFIG.ERRORS.CONTENT_ID_REQUIRED);
        }
        return contentId;
    },

    validateFileContent(content) {
        if (content.content_type !== 'file') {
            throw new Error(CONFIG.ERRORS.NOT_FILE_CONTENT);
        }
        return content;
    }
};

// ============== RESPONSE SERVICE ==============
const responseService = {
    createFileResponse(fileBuffer, fileType, fileName) {
        const headers = {
            'Content-Type': fileType || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${fileName || 'file'}"`,
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        };

        return new NextResponse(fileBuffer, { headers });
    },

    createErrorResponse(message, status = 500) {
        return NextResponse.json(
            { error: message },
            { status }
        );
    },

    handleError(error) {
        console.error('File retrieval error:', error);

        const errorStatusMap = {
            [CONFIG.ERRORS.UNAUTHORIZED]: 401,
            [CONFIG.ERRORS.CONTENT_ID_REQUIRED]: 400,
            [CONFIG.ERRORS.CONTENT_NOT_FOUND]: 404,
            [CONFIG.ERRORS.NOT_FILE_CONTENT]: 400,
            [CONFIG.ERRORS.INVALID_FILE_DATA]: 400,
            [CONFIG.ERRORS.FILE_READ_FAILED]: 404
        };

        const status = errorStatusMap[error.message] || 500;
        const message = errorStatusMap[error.message] 
            ? error.message 
            : CONFIG.ERRORS.INTERNAL;

        return this.createErrorResponse(message, status);
    }
};

// ============== MAIN HANDLER ==============
export async function GET(request, { params }) {
    try {
        // Authenticate user
        const user = await authService.getAuthenticatedUser();
        
        // Validate and extract content ID
        const staticParams = await params;
        const contentId = validationService.validateContentId(staticParams.contentId);

        // Fetch content with class information
        const content = await dbService.getContentWithClass(contentId);
        
        // Validate it's a file
        validationService.validateFileContent(content);

        // Parse file metadata
        const fileData = dbService.parseContentData(content.content_data);

        // Read file from disk using class ID and file name
        const fileBuffer = await fileService.readFileFromDisk(
            content.class_id.toString(), 
            fileData.fileName
        );

        // Return file response
        return responseService.createFileResponse(
            fileBuffer,
            fileData.fileType,
            fileData.originalName || fileData.fileName
        );

    } catch (error) {
        return responseService.handleError(error);
    }
}
