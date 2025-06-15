import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';
import { CONFIG } from '../../../../constants/config';

const auth = {
    async getUser() {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        return session.user;
    },
    async canUpload(userId, userLevel, classId) {
        return userLevel === CONFIG.USER_LEVELS.ADMIN || 
               (userLevel === CONFIG.USER_LEVELS.TEACHER && await this.ownsClass(userId, classId));
    },
    async ownsClass(userId, classId) {
        const result = await executeQueryWithRetry({
            query: 'SELECT class_id FROM classes WHERE class_id = ? AND teacher_id = ?',
            values: [classId, userId]
        });
        return result.length > 0;
    }
};

const db = {
    async saveContent(contentType, contentData, classId, isPublic) {
        // Single INSERT with auto-linking via foreign key constraints
        const result = await executeQueryWithRetry({
            query: `
                INSERT INTO content (content_type, content_data, is_public) 
                VALUES (?, ?, ?)
            `,
            values: [contentType, JSON.stringify(contentData), isPublic ? 1 : 0]
        });
        
        const contentId = result.insertId;
        
        // Link to class - this will be automatically cleaned up if class is deleted
        await executeQueryWithRetry({
            query: 'INSERT INTO class_content (class_id, content_id) VALUES (?, ?)',
            values: [classId, contentId]
        });
        
        return contentId;
    }
};

const content = {
    buildText(text, userId) {
        return { text, uploadedBy: userId, isFile: false };
    },
    buildFile(fileData) {
        return { ...fileData, isFile: true };
    }
};

const validate = (body) => {
    const { classId, contentType, contentData } = body;
    
    if (!classId) throw new Error(CONFIG.ERRORS.MISSING_CLASS_ID);
    if (!contentType || !contentData) throw new Error(CONFIG.ERRORS.MISSING_CONTENT);
    
    return { classId, contentType, contentData, isPublic: body.isPublic || false };
};

const respond = (data, status = 200) => 
    new Response(JSON.stringify(data), { 
        status, 
        headers: { 'Content-Type': 'application/json' } 
    });

const handleError = (error) => {
    console.error('Content save error:', error);
    
    const statusMap = {
        [CONFIG.ERRORS.UNAUTHORIZED]: 401,
        [CONFIG.ERRORS.MISSING_CLASS_ID]: 400,
        [CONFIG.ERRORS.MISSING_CONTENT]: 400,
        [CONFIG.ERRORS.DB_FAILED]: 500
    };
    
    const status = statusMap[error.message] || 500;
    const message = statusMap[error.message] ? error.message : CONFIG.ERRORS.INTERNAL;
    
    return respond({ error: message }, status);
};

export async function POST(req) {
    try {
        const user = await auth.getUser();
        const { classId, contentType, contentData, isPublic } = validate(await req.json());
        
        if (!await auth.canUpload(user.id, user.level, classId)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }
        
        const data = contentType === 'text' 
            ? content.buildText(contentData.text, user.id)
            : content.buildFile(contentData);
            
        const contentId = await db.saveContent(contentType, data, classId, isPublic);
        
        return respond({ success: true, contentId });
    } catch (error) {
        return handleError(error);
    }
}
