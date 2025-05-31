import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { CONFIG } from '../../../../constants/config';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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

    parseContentData(content_data) {
        try {
            return JSON.parse(content_data);
        } catch (error) {
            throw new Error(CONFIG.ERRORS.INVALID_FILE_DATA);
        }
    }
};

// ============== PDF SERVICE ==============
const pdfService = {
    async convertPdfPageToImage(pdfBuffer, pageNumber = 1, scale = 2.0) {
        try {
            const loadingTask = pdfjsLib.getDocument(pdfBuffer);
            const pdf = await loadingTask.promise;
            
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale });
            
            // Create canvas
            const canvas = new OffscreenCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Convert to blob
            const blob = await canvas.convertToBlob({ type: 'image/png' });
            const buffer = await blob.arrayBuffer();
            
            return {
                buffer: new Uint8Array(buffer),
                totalPages: pdf.numPages,
                width: viewport.width,
                height: viewport.height
            };
        } catch (error) {
            console.error('PDF conversion failed:', error);
            throw new Error('Failed to convert PDF to image');
        }
    },

    async getPdfMetadata(pdfBuffer) {
        try {
            const loadingTask = pdfjsLib.getDocument(pdfBuffer);
            const pdf = await loadingTask.promise;
            
            return {
                totalPages: pdf.numPages,
                fingerprint: pdf.fingerprint
            };
        } catch (error) {
            console.error('PDF metadata extraction failed:', error);
            throw new Error('Failed to extract PDF metadata');
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
        if (!contentId) throw new Error(CONFIG.ERRORS.CONTENT_ID_REQUIRED);
        return contentId;
    },

    validatePageNumber(pageParam, totalPages) {
        const pageNumber = parseInt(pageParam) || 1;
        if (pageNumber < 1 || pageNumber > totalPages) {
            throw new Error('Invalid page number');
        }
        return pageNumber;
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
    createImageResponse(imageBuffer) {
        const headers = {
            'Content-Type': 'image/png',
            'Content-Disposition': 'inline',
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive'
        };

        return new NextResponse(imageBuffer, { headers });
    },

    createMetadataResponse(metadata) {
        return NextResponse.json(metadata, {
            headers: {
                'Cache-Control': 'private, no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    },

    createErrorResponse(message, status = 500) {
        return NextResponse.json({ error: message }, { status });
    },

    handleError(error) {
        console.error('PDF conversion error:', error);

        const errorStatusMap = {
            [CONFIG.ERRORS.UNAUTHORIZED]: 401,
            [CONFIG.ERRORS.CONTENT_ID_REQUIRED]: 400,
            [CONFIG.ERRORS.CONTENT_NOT_FOUND]: 404,
            [CONFIG.ERRORS.NOT_FILE_CONTENT]: 400,
            [CONFIG.ERRORS.INVALID_FILE_DATA]: 400,
            [CONFIG.ERRORS.FILE_READ_FAILED]: 404,
            'Invalid page number': 400,
            'Failed to convert PDF to image': 500,
            'Failed to extract PDF metadata': 500
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
        const user = await authService.getAuthenticatedUser();
        
        const staticParams = await params;
        const contentId = validationService.validateContentId(staticParams.contentId);
        
        const url = new URL(request.url);
        const pageParam = url.searchParams.get('page');
        const isMetadata = url.searchParams.get('metadata') === 'true';

        const content = await dbService.getContentWithClass(contentId);
        validationService.validateFileContent(content);

        const fileData = dbService.parseContentData(content.content_data);
        
        // Only process PDF files
        if (!fileData.fileType?.includes('pdf')) {
            throw new Error('This endpoint only handles PDF files');
        }

        const fileBuffer = await fileService.readFileFromDisk(
            content.class_id.toString(), 
            fileData.fileName
        );

        // Return metadata if requested
        if (isMetadata) {
            const metadata = await pdfService.getPdfMetadata(fileBuffer);
            return responseService.createMetadataResponse(metadata);
        }

        // Convert PDF page to image
        const metadata = await pdfService.getPdfMetadata(fileBuffer);
        const pageNumber = validationService.validatePageNumber(pageParam, metadata.totalPages);
        
        const result = await pdfService.convertPdfPageToImage(fileBuffer, pageNumber);
        
        return responseService.createImageResponse(result.buffer);

    } catch (error) {
        return responseService.handleError(error);
    }
}
