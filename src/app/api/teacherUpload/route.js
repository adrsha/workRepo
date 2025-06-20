// remove the old video if new one is added

import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';
import { writeFile, mkdir, access, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';
import { createHash, randomBytes } from 'crypto';

const SECURITY_CONFIG = {
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/quicktime'],
    ALLOWED_EXTENSIONS: ['.mp4', '.webm', '.mov', '.avi', '.qt'],
    MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB
    MIN_FILE_SIZE: 1024, // 1KB
    MAX_FILENAME_LENGTH: 100,
    ALLOWED_USER_LEVEL: 1,
    RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
    MAX_UPLOADS_PER_WINDOW: 2,
};


// Rate limiting store
const uploadAttempts = new Map();

// Request Parser
const requestParser = {
    async parseFormData(req) {
        const contentType = req.headers.get('content-type');
        if (!contentType?.includes('multipart/form-data')) {
            throw new Error('Invalid content type. Expected multipart/form-data');
        }
        
        const formData = await req.formData();
        const video = formData.get('video');
        const userIdParam = formData.get('user_id');
        
        if (!video || !(video instanceof File)) {
            throw new Error('Video file is required');
        }
        
        return { 
            video, 
            targetUserId: this.parseUserId(userIdParam)
        };
    },

    parseUserId(userIdParam) {
        if (!userIdParam) return null;
        
        const userId = parseInt(userIdParam, 10);
        if (isNaN(userId) || userId <= 0) {
            throw new Error('Invalid user ID format');
        }
        
        return userId;
    }
};

// Security utilities
const securityUtils = {
    sanitizeFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            throw new Error('Invalid filename');
        }
        
        const sanitized = fileName
            .replace(/[<>:"|?*\x00-\x1f]/g, '')
            .replace(/\.+/g, '.')
            .replace(/^\.+|\.+$/g, '')
            .trim();
            
        if (!sanitized || sanitized.length > SECURITY_CONFIG.MAX_FILENAME_LENGTH) {
            throw new Error('Invalid filename format');
        }
        
        return sanitized;
    },

    generateSecureFileName(userId, originalName) {
        const timestamp = Date.now();
        const randomString = randomBytes(8).toString('hex');
        const hash = createHash('sha256')
            .update(`${userId}-${timestamp}-${randomString}`)
            .digest('hex')
            .substring(0, 16);
            
        const sanitizedName = this.sanitizeFileName(originalName);
        const extension = extname(sanitizedName).toLowerCase();
        const baseName = basename(sanitizedName, extension);
        
        return `${baseName}_${hash}_${timestamp}${extension}`;
    },

    validateFileExtension(fileName, mimeType) {
        const extension = extname(fileName).toLowerCase();
        
        if (!SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
            throw new Error(`File extension ${extension} not allowed`);
        }
        
        const mimeExtensionMap = {
            'video/mp4': ['.mp4'],
            'video/webm': ['.webm'],
            'video/mov': ['.mov'],
            'video/avi': ['.avi'],
            'video/quicktime': ['.mov', '.qt']
        };
        
        const allowedExtensions = mimeExtensionMap[mimeType];
        if (!allowedExtensions || !allowedExtensions.includes(extension)) {
            throw new Error('File extension does not match MIME type');
        }
    },

    async validateFileContent(buffer) {
        const signatures = {
            mp4: [0x00, 0x00, 0x00, undefined, 0x66, 0x74, 0x79, 0x70],
            webm: [0x1A, 0x45, 0xDF, 0xA3],
            mov: [0x00, 0x00, 0x00, undefined, 0x66, 0x74, 0x79, 0x70],
            avi: [0x52, 0x49, 0x46, 0x46, undefined, undefined, undefined, undefined, 0x41, 0x56, 0x49, 0x20]
        };
        
        const header = Array.from(buffer.slice(0, 12));
        
        const isValidSignature = Object.values(signatures).some(signature => 
            signature.every((byte, index) => 
                byte === undefined || header[index] === byte
            )
        );
        
        if (!isValidSignature) {
            throw new Error('Invalid video file format detected');
        }
    },

    checkRateLimit(userId) {
        const now = Date.now();
        const userAttempts = uploadAttempts.get(userId) || [];
        
        const recentAttempts = userAttempts.filter(
            timestamp => now - timestamp < SECURITY_CONFIG.RATE_LIMIT_WINDOW
        );
        
        if (recentAttempts.length >= SECURITY_CONFIG.MAX_UPLOADS_PER_WINDOW) {
            throw new Error('Upload rate limit exceeded. Please try again later.');
        }
        
        recentAttempts.push(now);
        uploadAttempts.set(userId, recentAttempts);
    }
};

// User Service
const userService = {
    async getSessionUser() {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            throw new Error('Authentication required');
        }
        return session.user;
    },

    async getUserById(userId) {
        if (!userId || typeof userId !== 'number') {
            throw new Error('Invalid user ID');
        }

        const result = await executeQueryWithRetry({
            query: 'SELECT id, level, email FROM users WHERE id = ?',
            values: [userId]
        });

        if (!result || result.length === 0) {
            throw new Error('User not found');
        }

        return result[0];
    },

    validateUserPermissions(user) {
        if (user.level !== SECURITY_CONFIG.ALLOWED_USER_LEVEL) {
            throw new Error('Insufficient permissions for video upload');
        }
        
        if (!user.id || typeof user.id !== 'number') {
            throw new Error('Invalid user session');
        }
    },

    canUploadForUser(sessionUser, targetUser) {
        // Same user can upload for themselves
        if (sessionUser.id === targetUser.id) {
            return true;
        }
        
        // Add additional permission logic here
        // For now, only allow self-uploads
        return false;
    },

    async resolveTargetUser(targetUserId) {
        const sessionUser = await this.getSessionUser();
        
        // If no target user specified, use session user
        if (!targetUserId) {
            this.validateUserPermissions(sessionUser);
            return sessionUser;
        }
        
        // Get target user and validate permissions
        const targetUser = await this.getUserById(targetUserId);
        
        if (!this.canUploadForUser(sessionUser, targetUser)) {
            throw new Error('Insufficient permissions to upload for specified user');
        }
        
        this.validateUserPermissions(targetUser);
        return targetUser;
    }
};

// File Service
const fileService = {
    async ensureVideoDirectory() {
        const videoDir = join(process.cwd(), 'public', 'uploads', 'teachers', 'videos');
        
        try {
            await access(videoDir);
        } catch {
            await mkdir(videoDir, { recursive: true, mode: 0o755 });
        }
        
        return videoDir;
    },

    validateFile(file) {
        if (!file || !(file instanceof File)) {
            throw new Error('Invalid file object');
        }
        
        if (!SECURITY_CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type)) {
            throw new Error(`Video type ${file.type} not allowed`);
        }
        
        if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
            throw new Error(`File too large. Maximum size: ${Math.round(SECURITY_CONFIG.MAX_FILE_SIZE / (1024 * 1024))}MB`);
        }
        
        if (file.size < SECURITY_CONFIG.MIN_FILE_SIZE) {
            throw new Error('File too small. Minimum size: 1KB');
        }
        
        securityUtils.validateFileExtension(file.name, file.type);
    },

    async saveFile(buffer, filePath) {
        try {
            await writeFile(filePath, buffer, { mode: 0o644 });
        } catch (error) {
            console.error('Failed to save video file:', error);
            throw new Error('Failed to save video file');
        }
    },

    async cleanup(filePath) {
        try {
            await unlink(filePath);
        } catch (error) {
            console.error('Failed to cleanup file:', error);
        }
    }
};

// Database Service
const dbService = {
    async getTeacher(userId) {
        const result = await executeQueryWithRetry({
            query: 'SELECT user_id, video_path FROM teachers WHERE user_id = ?',
            values: [userId]
        });
        return result[0] || null;
    },

    async updateTeacher(userId, videoPath) {
        const result = await executeQueryWithRetry({
            query: 'UPDATE teachers SET video_path = ? WHERE user_id = ?',
            values: [videoPath, userId]
        });
        
        if (result.affectedRows === 0) {
            throw new Error('Failed to update teacher record');
        }
    },

    async createTeacher(userId, videoPath) {
        await executeQueryWithRetry({
            query: 'INSERT INTO teachers (user_id, video_path) VALUES (?, ?)',
            values: [userId, videoPath]
        });
    },

    async upsertTeacherVideo(userId, videoPath) {
        const existing = await this.getTeacher(userId);
        
        if (existing) {
            await this.updateTeacher(userId, videoPath);
        } else {
            await this.createTeacher(userId, videoPath);
        }
        
        return { 
            isUpdate: !!existing, 
            oldPath: existing?.video_path 
        };
    }
};

// Video Processor
const videoProcessor = {
    async process(file, userId) {
        let filePath = null;
        
        try {
            // Validate and prepare
            securityUtils.checkRateLimit(userId);
            fileService.validateFile(file);
            
            // Generate paths
            const fileName = securityUtils.generateSecureFileName(userId, file.name);
            const videoDir = await fileService.ensureVideoDirectory();
            const serverPath = join(videoDir, fileName);
            const publicPath = `/uploads/teachers/videos/${fileName}`;
            
            // Process file
            const buffer = Buffer.from(await file.arrayBuffer());
            await securityUtils.validateFileContent(buffer);
            
            // Save file
            filePath = serverPath;
            await fileService.saveFile(buffer, serverPath);
            
            // Update database
            const dbResult = await dbService.upsertTeacherVideo(userId, publicPath);
            
            // Cleanup old file if update
            if (dbResult.isUpdate && dbResult.oldPath) {
                const oldServerPath = join(process.cwd(), 'public', dbResult.oldPath);
                fileService.cleanup(oldServerPath).catch(() => {});
            }
            
            return {
                fileName,
                filePath: publicPath,
                fileSize: file.size,
                fileType: file.type,
                uploadedBy: userId,
                isUpdate: dbResult.isUpdate
            };
            
        } catch (error) {
            if (filePath) {
                await fileService.cleanup(filePath);
            }
            throw error;
        }
    }
};

// Response Handler
const responseHandler = {
    success(data, status = 200) {
        return new Response(JSON.stringify(data), { 
            status,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            }
        });
    },

    error(message, status = 400) {
        return this.success({ 
            error: true, 
            message 
        }, status);
    },

    handleError(error) {
        console.error('Video upload error:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        const errorStatusMap = {
            'Authentication required': 401,
            'Insufficient permissions for video upload': 403,
            'Insufficient permissions to upload for specified user': 403,
            'User not found': 404,
            'Upload rate limit exceeded. Please try again later.': 429,
            'Database operation failed': 500,
            'Failed to save video file': 500
        };

        const status = errorStatusMap[error.message] || 400;
        const clientMessage = status >= 500 ? 'Internal server error' : error.message;

        return this.error(clientMessage, status);
    }
};

// Main Handler
export async function POST(req) {
    try {
        // Parse request
        const { video, targetUserId } = await requestParser.parseFormData(req);
        
        // Resolve target user (handles authentication and permissions)
        const targetUser = await userService.resolveTargetUser(targetUserId);
        
        // Process upload
        const result = await videoProcessor.process(video, targetUser.id);
        
        return responseHandler.success({
            success: true,
            message: result.isUpdate ? 'Video updated successfully' : 'Video uploaded successfully',
            data: {
                fileName: result.fileName,
                filePath: result.filePath,
                fileSize: result.fileSize,
                fileType: result.fileType,
                uploadedFor: targetUser.id
            }
        });

    } catch (error) {
        return responseHandler.handleError(error);
    }
}
