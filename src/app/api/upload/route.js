import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { CONFIG } from '../../../constants/config';
import { generateFileName, getPublicFilePath } from '../../../utils/contentUtils';

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

const getFileConfig = (classId) => ({
    isCertificate: classId === 'teacher-certificates',
    config: classId === 'teacher-certificates' ? SIGNUP_FILE_CONFIG : null
});

const pathService = {
    buildServerPath(classId, isSignupForm) {
        const { isCertificate } = getFileConfig(classId);
        
        if (isSignupForm && isCertificate) {
            return join(CONFIG.SERVER_UPLOADS_DIR, 'signup-certificates', 'teacher-certificates');
        }
        return join(CONFIG.SERVER_UPLOADS_DIR, classId);
    },

    buildPublicPath(classId, fileName, isSignupForm) {
        const { isCertificate } = getFileConfig(classId);
        
        if (isSignupForm && isCertificate) {
            return `/uploads/signup-certificates/teacher-certificates/${fileName}`;
        }
        return getPublicFilePath(classId, fileName);
    }
};

const validateFile = (file, classId, isSignupForm) => {
    if (!file?.name || !file?.size || !file?.type) {
        throw new Error(CONFIG.ERRORS.MISSING_FILE);
    }

    const { config } = getFileConfig(classId);
    
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

    async processUpload(file, classId, userId, isSignupForm = false) {
        const fileName = generateFileName(userId, file.name);
        const serverDir = pathService.buildServerPath(classId, isSignupForm);
        const serverPath = join(serverDir, fileName);
        const publicPath = pathService.buildPublicPath(classId, fileName, isSignupForm);
        
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
        [CONFIG.ERRORS.MISSING_CLASS_ID]: 400,
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
        const classId = formData.get('classId');
        const isSignupForm = formData.get('isSignupForm') === 'true';

        if (!classId) {
            throw new Error(CONFIG.ERRORS.MISSING_CLASS_ID);
        }

        // Check auth only for non-signup forms
        if (!isSignupForm) {
            const session = await authService.getSession();
            if (!session?.user) {
                throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
            }
        }

        validateFile(file, classId, isSignupForm);
        
        const userId = await authService.getUserId();
        const fileData = await fileService.processUpload(file, classId, userId, isSignupForm);
        
        return createResponse(fileData);
    } catch (error) {
        return createErrorResponse(error);
    }
}
