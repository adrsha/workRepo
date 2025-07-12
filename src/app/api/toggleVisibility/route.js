import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';
import { CONFIG } from '../../../constants/config';

const authService = {
    async getAuthenticatedUser() {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        return session.user;
    },

    async canUserToggleVisibility(userId, userLevel, contentId) {
        if (userLevel === CONFIG.USER_LEVELS.ADMIN) return true;
        if (userLevel === CONFIG.USER_LEVELS.TEACHER) {
            return await this.isContentOwner(userId, contentId);
        }
        return false;
    },

    async isContentOwner(userId, contentId) {
        const result = await executeQueryWithRetry({
            query: `
                SELECT c.content_id 
                FROM content c
                JOIN class_content cc ON c.content_id = cc.content_id
                JOIN classes cl ON cc.class_id = cl.class_id
                WHERE c.content_id = ? AND cl.teacher_id = ?
            `,
            values: [contentId, userId]
        });
        return result.length > 0;
    }
};

const dbService = {
    async getContentVisibility(contentId) {
        const result = await executeQueryWithRetry({
            query: 'SELECT is_public FROM content WHERE content_id = ?',
            values: [contentId]
        });
        
        if (!result.length) return null;
        return result[0].is_public === 1;
    },

    async toggleContentVisibility(contentId) {
        const currentVisibility = await this.getContentVisibility(contentId);
        if (currentVisibility === null) {
            throw new Error(CONFIG.ERRORS.CONTENT_NOT_FOUND);
        }

        const newVisibility = !currentVisibility;
        
        await executeQueryWithRetry({
            query: 'UPDATE content SET is_public = ? WHERE content_id = ?',
            values: [newVisibility ? 1 : 0, contentId]
        });

        return newVisibility;
    }
};

const requestHandler = {
    validateRequest(body) {
        const { contentId } = body;

        if (!contentId) throw new Error(CONFIG.ERRORS.MISSING_CONTENT_ID);

        return { contentId };
    },

    createResponse(data, status = 200) {
        return new Response(JSON.stringify(data), { 
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    },

    handleError(error) {
        console.error('Content visibility toggle error:', error);

        const errorStatusMap = {
            [CONFIG.ERRORS.UNAUTHORIZED]: 401,
            [CONFIG.ERRORS.MISSING_CONTENT_ID]: 400,
            [CONFIG.ERRORS.CONTENT_NOT_FOUND]: 404,
            [CONFIG.ERRORS.DB_FAILED]: 500
        };

        const status = errorStatusMap[error.message] || 500;
        const message = errorStatusMap[error.message] ? error.message : CONFIG.ERRORS.INTERNAL;

        return this.createResponse({ error: message }, status);
    }
};

export async function PATCH(req) {
    try {
        const user = await authService.getAuthenticatedUser();
        const body = await req.json();
        const { contentId } = requestHandler.validateRequest(body);

        const canToggle = await authService.canUserToggleVisibility(user.id, user.level, contentId);
        if (!canToggle) throw new Error(CONFIG.ERRORS.UNAUTHORIZED);

        const newVisibility = await dbService.toggleContentVisibility(contentId);
        
        return requestHandler.createResponse({
            contentId,
            isPublic: newVisibility,
            message: `Content visibility updated to ${newVisibility ? 'public' : 'private'}`
        });
    } catch (error) {
        return requestHandler.handleError(error);
    }
}
