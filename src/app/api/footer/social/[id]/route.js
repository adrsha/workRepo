import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
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
async function updateSocialLink(socialId, socialData) {
    try {
        // await authService.requireAdmin();

        if (!validateInput.isValidId(socialId)) {
            throw new Error('Valid social link ID is required');
        }

        const { platform, url, icon_svg, display_order } = socialData;

        // Validate inputs
        if (!platform || typeof platform !== 'string') {
            throw new Error('Valid platform name is required');
        }
        if (display_order < 0 || display_order > 999) {
            throw new Error('Display order must be between 0 and 999');
        }

        const sanitizedPlatform = validateInput.sanitizeString(platform, 50);
        const sanitizedUrl = validateInput.sanitizeString(url, 255);
        const sanitizedIconSvg = validateInput.sanitizeString(icon_svg, 2000);

        await executeQueryWithRetry({
            query: 'UPDATE footer_social_links SET platform = ?, url = ?, icon_svg = ?, display_order = ? WHERE id = ?',
            values: [sanitizedPlatform, sanitizedUrl, sanitizedIconSvg, display_order, socialId]
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating social link:', error);
        throw new Error(error.message || 'Failed to update social link');
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
    console.error('Footer social API error:', error);
    return respond({ error: error.message }, 500);
};

export async function PUT(req, { params }) {
    try {
        const user = await auth.getUser();

        if (!await auth.canManageFooter(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }

        const socialData = await req.json();
        const socialId = params.id;

        const result = await updateSocialLink(socialId, socialData);
        return respond(result);
    } catch (error) {
        return handleError(error);
    }
}
