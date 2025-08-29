import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';

// Constants
const UPLOADS_DIR = 'uploads';

// Services
const authService = {
    async getSession() {
        return await getServerSession(authOptions);
    },

    async requireAuth() {
        const session = await this.getSession();
        if (!session?.user) {
            throw new Error('Unauthorized');
        }
        return session;
    }
};

const pathService = {
    validatePath(path) {
        if (!path) return true;
        return !path.includes('..') && 
               !path.includes('\\') && 
               path.match(/^[a-zA-Z0-9_\-\/\.]+$/);
    },

    sanitizePath(path) {
        return path?.replace(/^\/+|\/+$/g, '') || '';
    },

    buildPublicPath(directory, fileName) {
        const parts = [UPLOADS_DIR];
        if (directory) parts.push(directory);
        if (fileName) parts.push(fileName);
        return `/${parts.join('/')}`;
    },

    buildRelativePath(directory, fileName) {
        const parts = [];
        if (directory) parts.push(directory);
        if (fileName) parts.push(fileName);
        return parts.join('/');
    }
};

const fileService = {
    async getFileStats(filePath) {
        try {
            const stats = await stat(filePath);
            return {
                size            : this.formatFileSize(stats.size),
                rawSize         : stats.size,
                isDirectory     : stats.isDirectory(),
                isFile          : stats.isFile(),
                lastModified    : stats.mtime
            };
        } catch (error) {
            return null;
        }
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getFileType(fileName) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        
        const typeMap = {
            'pdf'   : 'application/pdf',
            'jpg'   : 'image/jpeg',
            'jpeg'  : 'image/jpeg',
            'png'   : 'image/png',
            'gif'   : 'image/gif',
            'webp'  : 'image/webp',
            'txt'   : 'text/plain',
            'doc'   : 'application/msword',
            'docx'  : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        
        return typeMap[extension] || 'application/octet-stream';
    },

    async listFiles(directory = '') {
        const publicDir = join(process.cwd(), 'public');
        const uploadsDir = join(publicDir, UPLOADS_DIR);
        
        // Sanitize directory path
        const sanitizedDir = pathService.sanitizePath(directory);
        const targetDir = sanitizedDir ? join(uploadsDir, sanitizedDir) : uploadsDir;
        
        // Security check: ensure target directory is within uploads directory
        const resolvedTarget = resolve(targetDir);
        const resolvedUploads = resolve(uploadsDir);
        
        if (!resolvedTarget.startsWith(resolvedUploads)) {
            throw new Error('Access denied');
        }

        try {
            const entries = await readdir(targetDir);
            const files = [];
            const directories = [];

            for (const entry of entries) {
                const fullPath = join(targetDir, entry);
                const stats = await this.getFileStats(fullPath);
                
                if (!stats) continue;

                const relativePath = pathService.buildRelativePath(sanitizedDir, entry);
                const publicPath = pathService.buildPublicPath(sanitizedDir, entry);

                const baseItem = {
                    name        : entry,
                    path        : relativePath,
                    publicPath  : publicPath,
                    fullPath    : fullPath
                };

                if (stats.isDirectory) {
                    directories.push({
                        ...baseItem,
                        type        : 'directory',
                        isDirectory : true,
                        isFile      : false
                    });
                } else if (stats.isFile) {
                    files.push({
                        ...baseItem,
                        type            : this.getFileType(entry),
                        size            : stats.size,
                        rawSize         : stats.rawSize,
                        lastModified    : stats.lastModified,
                        isDirectory     : false,
                        isFile          : true
                    });
                }
            }

            // Sort: directories first, then files alphabetically
            directories.sort((a, b) => a.name.localeCompare(b.name));
            files.sort((a, b) => a.name.localeCompare(b.name));

            return {
                items       : [...directories, ...files],
                directory   : sanitizedDir,
                hasParent   : !!sanitizedDir
            };
        } catch (error) {
            console.error('Error listing files:', error);
            
            if (error.code === 'ENOENT') {
                throw new Error('Directory not found');
            }
            
            throw new Error('Failed to list files');
        }
    }
};

// Response helpers
const responseService = {
    create(data, status = 200) {
        return new Response(
            JSON.stringify(data),
            {
                status,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    },

    createError(error) {
        console.error('File list error:', error);
        
        const errorMap = {
            'Unauthorized'          : 401,
            'Access denied'         : 403,
            'Directory not found'   : 404,
            'Failed to list files'  : 500
        };

        const status = errorMap[error.message] || 500;
        const message = errorMap[error.message] ? error.message : 'Internal server error';

        return this.create({ error: message }, status);
    }
};

export async function GET(req) {
    try {
        // Require authentication
        await authService.requireAuth();

        const { searchParams } = new URL(req.url);
        const directory = searchParams.get('directory') || '';

        // Validate directory path
        if (!pathService.validatePath(directory)) {
            throw new Error('Access denied');
        }

        const result = await fileService.listFiles(directory);
        
        return responseService.create(result);
    } catch (error) {
        return responseService.createError(error);
    }
}
