// /api/gameContent/save/route.js
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
    async saveContent(contentType, contentData, gameId, isPublic) {
        const result = await executeQueryWithRetry({
            query: `
                INSERT INTO content (content_type, content_data, is_public) 
                VALUES (?, ?, ?)
            `,
            values: [contentType, JSON.stringify(contentData), isPublic ? 1 : 0]
        });
        
        const contentId = result.insertId;
        
        await executeQueryWithRetry({
            query: 'INSERT INTO game_content (game_id, content_id) VALUES (?, ?)',
            values: [gameId, contentId]
        });
        
        return contentId;
    },

    async getContentById(contentId, gameId) {
        const result = await executeQueryWithRetry({
            query: `
                SELECT c.content_id, c.content_type, c.content_data, c.created_at, c.is_public
                FROM content c
                JOIN game_content gc ON c.content_id = gc.content_id
                WHERE c.content_id = ? AND gc.game_id = ?
            `,
            values: [contentId, gameId]
        });

        if (!result.length) return null;

        const record     = result[0];
        const parsedData = this.parseContentData(record.content_data);

        return {
            content_id:   record.content_id,
            content_type: record.content_type,
            created_at:   record.created_at,
            is_public:    record.is_public,
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
        return { 
            text:       text, 
            uploadedBy: userId, 
            isFile:     false 
        };
    },
    
    buildFile(fileData) {
        return { 
            ...fileData, 
            isFile: true 
        };
    }
};

const validate = (body) => {
    const { gameId, contentType, contentData } = body;
    
    if (!gameId)                      throw new Error('Game ID is required');
    if (!contentType || !contentData) throw new Error('Content type and data are required');
    
    return { 
        gameId:      gameId, 
        contentType: contentType, 
        contentData: contentData, 
        isPublic:    body.isPublic || false 
    };
};

const respond = (data, status = 200) => 
    new Response(JSON.stringify(data), { 
        status:  status, 
        headers: { 'Content-Type': 'application/json' } 
    });

const handleError = (error) => {
    console.error('Game content save error:', error);
    
    const statusMap = {
        'Unauthorized':                         401,
        'Game ID is required':                  400,
        'Content type and data are required':   400,
    };
    
    const status  = statusMap[error.message] || 500;
    const message = statusMap[error.message] ? error.message : 'Internal server error';
    
    return respond({ error: message }, status);
};

export async function POST(req) {
    try {
        const user = await auth.getUser();
        const { gameId, contentType, contentData, isPublic } = validate(await req.json());
        
        if (!await auth.canUpload(user.level)) {
            throw new Error('Unauthorized');
        }
        
        const data = contentType === 'text' 
            ? content.buildText(contentData.text, user.id)
            : content.buildFile(contentData);
            
        const contentId = await db.saveContent(contentType, data, gameId, isPublic);
        const result    = await db.getContentById(contentId, gameId);
        
        return respond(result);
    } catch (error) {
        return handleError(error);
    }
}
