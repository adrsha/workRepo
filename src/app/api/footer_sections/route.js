import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { CONFIG } from '../../../constants/config';
import { executeQueryWithRetry } from '../../lib/db';

const validateInput = {

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    sanitizeString(str, maxLength = 255) {
        if (typeof str !== 'string') return '';
        return str.trim().slice(0, maxLength);
    },

    isValidId(id) {
        return Number.isInteger(Number(id)) && Number(id) > 0;
    }
};
async function addSection(sectionData) {
    try {
        // await authService.requireAdmin();
        const { title, display_order = 0 } = sectionData;

        // Validate inputs
        if (!title || typeof title !== 'string') {
            throw new Error('Valid section title is required');
        }
        if (display_order < 0 || display_order > 999) {
            throw new Error('Display order must be between 0 and 999');
        }

        const sanitizedTitle = validateInput.sanitizeString(title, 100);

        const result = await executeQueryWithRetry({
            query: 'INSERT INTO footer_sections (title, display_order) VALUES (?, ?)',
            values: [sanitizedTitle, display_order]
        });

        return { id: result.insertId, success: true };
    } catch (error) {
        console.error('Error adding section:', error);
        throw new Error(error.message || 'Failed to add section');
    }
}
const auth = {
    async getUser() {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        return session.user;
    },

    async canManageFooter(userLevel) {
        return userLevel === CONFIG.USER_LEVELS.ADMIN;
    }
};

const respond = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });

const handleError = (error) => {
    console.error('Footer sections API error:', error);

    const statusMap = {
        [CONFIG.ERRORS.UNAUTHORIZED]: 401,
        [CONFIG.ERRORS.MISSING_CONTENT]: 400
    };

    const status = statusMap[error.message] || 500;
    const message = statusMap[error.message] ? error.message : 'Internal server error';

    return respond({ error: message }, status);
};

export async function POST(req) {
    try {
        const user = await auth.getUser();

        if (!await auth.canManageFooter(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }

        const sectionData = await req.json();

        if (!sectionData.title) {
            throw new Error(CONFIG.ERRORS.MISSING_CONTENT);
        }

        const result = await addSection(sectionData);
        return respond(result);
    } catch (error) {
        return handleError(error);
    }
}
