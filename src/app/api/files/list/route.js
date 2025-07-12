import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { CONFIG } from '../../../../constants/config';

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

const fileService = {
    async getFileStats(filePath) {
        try {
            const stats = await stat(filePath);
            return {
                size: this.formatFileSize(stats.size),
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                lastModified: stats.mtime
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
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'txt': 'text/plain',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        return typeMap[extension] || 'application/octet-stream';
    },

    async listFiles(directory = '') {
        const uploadsDir = CONFIG.SERVER_UPLOADS_DIR;
        const targetDir = directory ? join(uploadsDir, directory) : uploadsDir;
        
        try {
            const entries = await readdir(targetDir);
            const files = [];
            const directories = [];

            for (const entry of entries) {
                const fullPath = join(targetDir, entry);
                const stats = await this.getFileStats(fullPath);
                
                if (!stats) continue;

                if (stats.isDirectory) {
                    directories.push({
                        name: entry,
                        type: 'directory',
                        path: directory ? `${directory}/${entry}` : entry,
                        isDirectory: true
                    });
                } else if (stats.isFile) {
                    const publicPath = directory ? `/uploads/${directory}/${entry}` : `/uploads/${entry}`;
                    files.push({
                        name: entry,
                        type: this.getFileType(entry),
                        size: stats.size,
                        path: publicPath,
                        fullPath: fullPath,
                        lastModified: stats.lastModified,
                        isDirectory: false
                    });
                }
            }

            // Sort: directories first, then files alphabetically
            directories.sort((a, b) => a.name.localeCompare(b.name));
            files.sort((a, b) => a.name.localeCompare(b.name));

            return {
                files: [...directories, ...files],
                directory: directory,
                hasParent: !!directory
            };
        } catch (error) {
            console.error('Error listing files:', error);
            throw new Error('Failed to list files');
        }
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
    console.error('File list error:', error);
    
    const errorMap = {
        'Unauthorized': 401,
        'Failed to list files': 500,
        'Directory not found': 404
    };

    const status = errorMap[error.message] || 500;
    const message = errorMap[error.message] ? error.message : 'Internal server error';

    return createResponse({ error: message }, status);
};

export async function GET(req) {
    try {
        // Require authentication
        await authService.requireAuth();

        const { searchParams } = new URL(req.url);
        const directory = searchParams.get('directory') || '';

        // Validate directory path to prevent directory traversal
        if (directory.includes('..') || directory.includes('/') && !directory.match(/^[a-zA-Z0-9_-]+$/)) {
            throw new Error('Invalid directory path');
        }

        const result = await fileService.listFiles(directory);
        
        return createResponse(result);
    } catch (error) {
        return createErrorResponse(error);
    }
}
