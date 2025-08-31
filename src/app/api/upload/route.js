import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { writeFile, mkdir } from 'fs/promises';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { CONFIG } from '../../../constants/config';
import { generateFileName } from '../../../utils/contentUtils';

const SIGNUP_FILE_CONFIG = {
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    maxSize: 10 * 1024 * 1024, // 10MB
    typeError: 'Invalid file type. Only PDF and image files are allowed for certificates.',
    sizeError: 'File size too large. Maximum size is 10MB.'
};

const authService = {
    async getSession() {
        return await getServerSession(authOptions);
    },

    async getUserId() {
        const session = await this.getSession();
        return session?.user?.id || 'anonymous';
    }
};

const getFileConfig = (parentId) => ({
    isCertificate: parentId === 'teacher-certificates',
    config: parentId === 'teacher-certificates' ? SIGNUP_FILE_CONFIG : null
});

const pathService = {
    buildServerPath(parentId, parentType, isSignupForm) {
        const { isCertificate } = getFileConfig(parentId);

        if (isSignupForm && isCertificate) {
            return join(CONFIG.SERVER_UPLOADS_DIR, 'signup-certificates', 'teacher-certificates');
        }
        // Use parentType as main directory, parentId as subdirectory
        return join(CONFIG.SERVER_UPLOADS_DIR, parentType, parentId);
    },

    // Convert server path to public path by removing server uploads dir
    getPublicPath(serverPath) {
        const relativePath = serverPath.replace(CONFIG.SERVER_UPLOADS_DIR, '');
        return `/uploads${relativePath}`.replace(/\\/g, '/'); // Normalize path separators
    }
};

const validateFile = (file, parentId, isSignupForm) => {
    if (!file?.name || !file?.size || !file?.type) {
        throw new Error(CONFIG.ERRORS.MISSING_FILE);
    }

    const { config } = getFileConfig(parentId);

    if (isSignupForm && config) {
        if (!config.allowedTypes.includes(file.type)) {
            throw new Error(config.typeError);
        }
        if (file.size > config.maxSize) {
            throw new Error(config.sizeError);
        }
    }
};

const fileService = {
    async createDirectory(path) {
        await mkdir(path, { recursive: true });
        return path;
    },

    async save(file, serverPath) {
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(serverPath, buffer);
    },

    buildFileData(file, fileName, publicPath, userId, isSignupForm) {
        return {
            originalName: file.name,
            fileName,
            filePath: publicPath,
            fileSize: file.size,
            fileType: file.type,
            uploadedBy: userId,
            isSignupUpload: isSignupForm
        };
    },

    async processUpload(file, parentId, parentType, userId, isSignupForm = false) {
        const fileName = generateFileName(userId, file.name);
        const serverDir = pathService.buildServerPath(parentId, parentType, isSignupForm);
        const serverPath = join(serverDir, fileName);
        const publicPath = pathService.getPublicPath(serverPath);

        await this.createDirectory(serverDir);
        await this.save(file, serverPath);

        return this.buildFileData(file, fileName, publicPath, userId, isSignupForm);
    }
};

const createResponse = (data, status = 200) => new Response(
    JSON.stringify(data),
    {
        status,
        headers: { 'Content-Type': 'application/json' }
    }
);

const createErrorResponse = (error) => {
    console.error('File upload error:', error);

    const errorMap = {
        [CONFIG.ERRORS.UNAUTHORIZED]: 401,
        [CONFIG.ERRORS.MISSING_PARENT_ID]: 400,
        [CONFIG.ERRORS.MISSING_FILE]: 400,
        [SIGNUP_FILE_CONFIG.typeError]: 400,
        [SIGNUP_FILE_CONFIG.sizeError]: 400
    };

    const status = errorMap[error.message] || 500;
    const message = errorMap[error.message] ? error.message : CONFIG.ERRORS.INTERNAL;

    return createResponse({ error: message }, status);
};

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const isSignupForm = formData.get('isSignupForm') === 'true';
        const parentId = formData.get('parentId');
        const parentType = formData.get('parentType');

        if (!parentId) {
            throw new Error(CONFIG.ERRORS.MISSING_PARENT_ID || 'Parent ID is required');
        }

        if (!isSignupForm) {
            const session = await authService.getSession();
            if (!session?.user) {
                throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
            }
        }

        validateFile(file, parentId, isSignupForm);

        const userId = await authService.getUserId();
        const fileData = await fileService.processUpload(file, parentId, parentType, userId, isSignupForm);

        return createResponse(fileData);
    } catch (error) {
        return createErrorResponse(error);
    }
}

export async function DELETE(req) {
    try {
        const { filePath } = await req.json();

        if (!filePath) {
            return createResponse({ error: 'File path is required' }, 400);
        }

        // Convert public path back to server path
        const serverPath = join(
            CONFIG.SERVER_UPLOADS_DIR, 
            filePath.replace('/uploads', '').replace(/^\//, '')
        );

        // Check if file exists before attempting to delete
        if (existsSync(serverPath)) {
            await unlink(serverPath);
            return createResponse({ message: 'File deleted successfully' });
        } else {
            return createResponse({ message: 'File not found' }, 404);
        }

    } catch (error) {
        console.error('File deletion error:', error);
        return createResponse({ error: 'Failed to delete file' }, 500);
    }
}
