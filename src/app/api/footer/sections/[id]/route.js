import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '@/app/lib/db';
import { CONFIG } from '../../../../../constants/config';

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
async function updateSection(sectionId, sectionData) {
    try {
        if (!validateInput.isValidId(sectionId)) {
            throw new Error('Valid section ID is required');
        }

        const { title, display_order } = sectionData;

        // Validate inputs
        if (!title || typeof title !== 'string') {
            throw new Error('Valid section title is required');
        }
        if (display_order < 0 || display_order > 999) {
            throw new Error('Display order must be between 0 and 999');
        }

        const sanitizedTitle = validateInput.sanitizeString(title, 100);

        await executeQueryWithRetry({
            query: 'UPDATE footer_sections SET title = ?, display_order = ? WHERE id = ?',
            values: [sanitizedTitle, display_order, sectionId]
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating section:', error);
        throw new Error(error.message || 'Failed to update section');
    }
}

// Delete section (admin only)
async function deleteSection(sectionId) {
    try {

        if (!validateInput.isValidId(sectionId)) {
            throw new Error('Valid section ID is required');
        }

        await executeQueryWithRetry({
            query: 'UPDATE footer_sections SET is_active = 0 WHERE id = ?',
            values: [sectionId]
        });

        return { success: true };
    } catch (error) {
        console.error('Error deleting section:', error);
        throw new Error(error.message || 'Failed to delete section');
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
    console.error('Footer section API error:', error);
    return respond({ error: error.message }, 500);
};

export async function PUT(req, { params }) {
    try {
        const user = await auth.getUser();

        if (!await auth.canManageFooter(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }

        const sectionData = await req.json();
        const sectionId = params.id;

        const result = await updateSection(sectionId, sectionData);
        return respond(result);
    } catch (error) {
        return handleError(error);
    }
}

export async function DELETE(req, { params }) {
    try {
        const user = await auth.getUser();

        if (!await auth.canManageFooter(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }

        const sectionId = params.id;
        const result = await deleteSection(sectionId);
        return respond(result);
    } catch (error) {
        return handleError(error);
    }
}
