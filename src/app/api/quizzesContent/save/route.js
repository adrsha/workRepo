// /api/quizContent/save/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';

const auth = {
    async getUser() {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error('Unauthorized');
        return session.user;
    },
    
    async canUpload(userLevel) {
        return userLevel >= 1; // Admin level
    },
};

const db = {
    async saveContent(contentType, contentData, quizId, isPublic) {
        const result = await executeQueryWithRetry({
            query: `
                INSERT INTO content (content_type, content_data, is_public) 
                VALUES (?, ?, ?)
            `,
            values: [contentType, JSON.stringify(contentData), isPublic ? 1 : 0]
        });
        
        const contentId = result.insertId;
        
        await executeQueryWithRetry({
            query: 'INSERT INTO quiz_content (quiz_id, content_id) VALUES (?, ?)',
            values: [quizId, contentId]
        });
        
        return contentId;
    },

    async getContentById(contentId, quizId) {
        const result = await executeQueryWithRetry({
            query: `
                SELECT c.content_id, c.content_type, c.content_data, c.created_at, c.is_public
                FROM content c
                JOIN quiz_content qc ON c.content_id = qc.content_id
                WHERE c.content_id = ? AND qc.quiz_id = ?
            `,
            values: [contentId, quizId]
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
    const { quizId, contentType, contentData } = body;
    
    if (!quizId) throw new Error('Quiz ID is required');
    if (!contentType || !contentData) throw new Error('Content type and data are required');
    
    return { quizId, contentType, contentData, isPublic: body.isPublic || false };
};

const respond = (data, status = 200) => 
    new Response(JSON.stringify(data), { 
        status, 
        headers: { 'Content-Type': 'application/json' } 
    });

const handleError = (error) => {
    console.error('Quiz content save error:', error);
    
    const statusMap = {
        'Unauthorized': 401,
        'Quiz ID is required': 400,
        'Content type and data are required': 400,
    };
    
    const status = statusMap[error.message] || 500;
    const message = statusMap[error.message] ? error.message : 'Internal server error';
    
    return respond({ error: message }, status);
};

export async function POST(req) {
    try {
        const user = await auth.getUser();
        const { quizId, contentType, contentData, isPublic } = validate(await req.json());
        
        if (!await auth.canUpload(user.level)) {
            throw new Error('Unauthorized');
        }
        
        const data = contentType === 'text' 
            ? content.buildText(contentData.text, user.id)
            : content.buildFile(contentData);
            
        const contentId = await db.saveContent(contentType, data, quizId, isPublic);
        const result = await db.getContentById(contentId, quizId);
        
        return respond(result);
    } catch (error) {
        return handleError(error);
    }
}
