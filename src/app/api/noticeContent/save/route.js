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
    
    async canUpload(userLevel) {
        return userLevel === CONFIG.USER_LEVELS.ADMIN;
    },
};

const db = {
    async saveContent(contentType, contentData, noticeId, isPublic) {
        // Insert content first
        const result = await executeQueryWithRetry({
            query: `
                INSERT INTO content (content_type, content_data, is_public) 
                VALUES (?, ?, ?)
            `,
            values: [contentType, JSON.stringify(contentData), isPublic ? 1 : 0]
        });
        
        const contentId = result.insertId;
        
        // Link to notice
        await executeQueryWithRetry({
            query: 'INSERT INTO notices_content (notices_id, content_id) VALUES (?, ?)',
            values: [noticeId, contentId]
        });
        
        return contentId;
    },

    async getContentById(contentId, noticeId) {
        const result = await executeQueryWithRetry({
            query: `
                SELECT c.content_id, c.content_type, c.content_data, c.created_at, c.is_public
                FROM content c
                JOIN notices_content nc ON c.content_id = nc.content_id
                WHERE c.content_id = ? AND nc.notices_id = ?
            `,
            values: [contentId, noticeId]
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

    parseContentData(contentData) {
        try {
            return JSON.parse(contentData);
        } catch (err) {
            console.error('Failed to parse content data:', err);
            return {};
        }
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
    const { noticeId, contentType, contentData } = body;
    
    if (!noticeId) throw new Error(CONFIG.ERRORS.MISSING_NOTICE_ID);
    if (!contentType || !contentData) throw new Error(CONFIG.ERRORS.MISSING_CONTENT);
    
    return { noticeId, contentType, contentData, isPublic: body.isPublic || false };
};

const respond = (data, status = 200) => 
    new Response(JSON.stringify(data), { 
        status, 
        headers: { 'Content-Type': 'application/json' } 
    });

const handleError = (error) => {
    console.error('Notice content save error:', error);
    
    const statusMap = {
        [CONFIG.ERRORS.UNAUTHORIZED]: 401,
        [CONFIG.ERRORS.MISSING_NOTICE_ID]: 400,
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
        const { noticeId, contentType, contentData, isPublic } = validate(await req.json());
        
        if (!await auth.canUpload(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }
        
        const data = contentType === 'text' 
            ? content.buildText(contentData.text, user.id)
            : content.buildFile(contentData);
            
        const contentId = await db.saveContent(contentType, data, noticeId, isPublic);
        
        // Get the saved content with parsed data (same as saveContent API)
        const result = await db.getContentById(contentId, noticeId);
        
        return respond(result);
    } catch (error) {
        return handleError(error);
    }
}
