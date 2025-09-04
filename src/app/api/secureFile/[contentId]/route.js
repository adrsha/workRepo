import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { CONFIG } from '../../../../constants/config';

// ============== CONFIGURATION ==============
const CONTENT_TABLES = [
    { table: 'classes_content', idColumn: 'classes_id', parentType: 'classes' },
    { table: 'notices_content', idColumn: 'notices_id', parentType: 'notices' },
];

// ============== AUTHENTICATION SERVICE ==============
const authService = {
    async getAuthenticatedUser() {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        return session.user;
    },

    async getOptionalAuthenticatedUser() {
        const session = await getServerSession(authOptions);
        return session?.user || null;
    }
};

// ============== DATABASE SERVICE ==============
const dbService = {
    async getContentWithParent(contentId) {
        // Try each content table until we find the content
        for (const { table, idColumn, parentType } of CONTENT_TABLES) {
            const query = `
                SELECT 
                    c.content_id,
                    c.content_type, 
                    c.content_data, 
                    c.is_public,
                    ct.${idColumn} as parent_id,
                    '${parentType}' as parent_type
                FROM content c
                JOIN ${table} ct ON c.content_id = ct.content_id
                WHERE c.content_id = ?
            `;
                
            const rows = await executeQueryWithRetry({ 
                query, 
                values: [contentId] 
            });
            console.log("ROWS", rows)
            if (rows.length > 0) {
                return rows[0];
            }
        }

        throw new Error(CONFIG.ERRORS.CONTENT_NOT_FOUND);
    },

    parseContentData(content_data) {
        try {
            return JSON.parse(content_data);
        } catch (error) {
            throw new Error(CONFIG.ERRORS.INVALID_FILE_DATA);
        }
    }
};

// ============== FILE SERVICE ==============
const fileService = {
    async readFileFromDisk(parentType, parentId, fileName) {
        try {
            const filePath = join(CONFIG.SERVER_UPLOADS_DIR, parentType, parentId.toString(), fileName);
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
    },

    validatePublicAccess(content, isPublicRequest, user) {
        // If it's a public request, ensure the content is actually public
        if (isPublicRequest) {
            return true;
        }

        // If it's not a public request and user is not authenticated, deny access
        if (!isPublicRequest && !user) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }

        // If content is not public and no user, deny access
        if (!content.is_public && !user) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }

        return true;
    }
};

// ============== RESPONSE SERVICE ==============
const responseService = {
    // Helper function to sanitize header values
    sanitizeHeaderValue(value) {
        if (typeof value !== 'string') return value;
        // Replace any character with code > 255 with a safe alternative
        return value.replace(/[^\x00-\xFF]/g, '?');
    },

    // Helper function to create safe filename for headers
    createSafeFilename(originalName) {
        if (!originalName) return 'file';
        
        // Remove or replace problematic characters for header safety
        return originalName
            .replace(/[^\x00-\x7F]/g, '_') // Replace non-ASCII with underscore
            .replace(/[<>:"/\\|?*]/g, '_') // Replace file system unsafe chars
            .replace(/["\r\n]/g, '_')      // Replace quotes and newlines
            .substring(0, 100);            // Limit length
    },

    createFileResponse(fileBuffer, fileType, fileName, isPublic = false) {
        // Use Headers constructor for proper header handling
        const headers = new Headers();
        
        // Set Content-Type with sanitization
        const safeContentType = this.sanitizeHeaderValue(fileType || 'application/octet-stream');
        headers.set('Content-Type', safeContentType);
        
        // Handle filename with proper encoding for Content-Disposition
        let dispositionValue = 'inline';
        if (fileName) {
            const safeFileName = this.createSafeFilename(fileName);
            
            // Use both ASCII fallback and UTF-8 encoded name
            if (fileName !== safeFileName) {
                // File has Unicode characters, use RFC 5987 format
                dispositionValue = `inline; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
            } else {
                // File is ASCII-safe
                dispositionValue = `inline; filename="${safeFileName}"`;
            }
        }
        headers.set('Content-Disposition', this.sanitizeHeaderValue(dispositionValue));

        // Set caching headers
        if (isPublic) {
            headers.set('Cache-Control', 'public, max-age=3600');
            headers.set('Pragma', 'cache');
            headers.set('Expires', new Date(Date.now() + 3600000).toUTCString());
        } else {
            headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('Expires', '0');
        }

        // Add security headers for private content
        if (!isPublic) {
            headers.set('X-Content-Type-Options', 'nosniff');
            headers.set('X-Frame-Options', 'DENY');
            headers.set('X-Download-Options', 'noopen');
        }

        // Debug logging to check headers
        console.log('Response headers:', Object.fromEntries(headers.entries()));

        return new NextResponse(fileBuffer, { 
            status: 200,
            headers 
        });
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
            [CONFIG.ERRORS.UNAUTHORIZED]:       401,
            [CONFIG.ERRORS.CONTENT_ID_REQUIRED]: 400,
            [CONFIG.ERRORS.CONTENT_NOT_FOUND]:   404,
            [CONFIG.ERRORS.NOT_FILE_CONTENT]:    400,
            [CONFIG.ERRORS.INVALID_FILE_DATA]:   400,
            [CONFIG.ERRORS.FILE_READ_FAILED]:    404,
            [CONFIG.ERRORS.CONTENT_NOT_PUBLIC]:  403,
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
        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const isPublicRequest = searchParams.get('public') === 'true';

        // Authenticate user (optional for public requests)
        const user = isPublicRequest 
            ? await authService.getOptionalAuthenticatedUser()
            : await authService.getAuthenticatedUser();
        
        // Validate and extract content ID
        const staticParams = await params;
        const contentId    = validationService.validateContentId(staticParams.contentId);
        console.log("Content Params", staticParams);
        console.log("Is Public Request", isPublicRequest);

        // Fetch content with parent information
        const content = await dbService.getContentWithParent(contentId);
        console.log("Content", content);
        
        // Validate file type
        validationService.validateFileContent(content);

        // Validate access permissions
        validationService.validatePublicAccess(content, isPublicRequest, user);

        // Parse file metadata
        const fileData = dbService.parseContentData(content.content_data);

        // Read file from disk
        const fileBuffer = await fileService.readFileFromDisk(
            content.parent_type,
            content.parent_id,
            fileData.fileName
        );

        // Return file response with appropriate caching based on public status
        return responseService.createFileResponse(
            fileBuffer,
            fileData.fileType,
            fileData.originalName || fileData.fileName,
            content.is_public
        );

    } catch (error) {
        return responseService.handleError(error);
    }
}
