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
// Update link (admin only)
async function updateLink(linkId, linkData) {
    try {
        // await authService.requireAdmin();

        if (!validateInput.isValidId(linkId)) {
            throw new Error('Valid link ID is required');
        }

        const { title, url, display_order } = linkData;

        // Validate inputs
        if (!title || typeof title !== 'string') {
            throw new Error('Valid link title is required');
        }
        if (display_order < 0 || display_order > 999) {
            throw new Error('Display order must be between 0 and 999');
        }

        const sanitizedTitle = validateInput.sanitizeString(title, 100);
        const sanitizedUrl = validateInput.sanitizeString(url, 255);

        await executeQueryWithRetry({
            query: 'UPDATE footer_links SET title = ?, url = ?, display_order = ? WHERE id = ?',
            values: [sanitizedTitle, sanitizedUrl, display_order, linkId]
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating link:', error);
        throw new Error(error.message || 'Failed to update link');
    }
}

// Delete link (admin only)
async function deleteLink(linkId) {
    try {
        // await authService.requireAdmin();

        if (!validateInput.isValidId(linkId)) {
            throw new Error('Valid link ID is required');
        }

        await executeQueryWithRetry({
            query: 'UPDATE footer_links SET is_active = 0 WHERE id = ?',
            values: [linkId]
        });

        return { success: true };
    } catch (error) {
        console.error('Error deleting link:', error);
        throw new Error(error.message || 'Failed to delete link');
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
    console.error('Footer link API error:', error);
    return respond({ error: error.message }, 500);
};

export async function PUT(req, { params }) {
    try {
        const user = await auth.getUser();

        if (!await auth.canManageFooter(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }

        const linkData = await req.json();
        const linkId = params.id;

        const result = await updateLink(linkId, linkData);
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

        const linkId = params.id;
        const result = await deleteLink(linkId);
        return respond(result);
    } catch (error) {
        return handleError(error);
    }
}
