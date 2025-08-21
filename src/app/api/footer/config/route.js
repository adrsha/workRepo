import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '@/app/lib/db';
import { CONFIG } from '../../../../constants/config';

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

async function updateConfig(configData) {
    try {

        const { company_name, company_description, contact_phone, contact_email, contact_address, copyright_text } = configData;

        // Validate inputs
        if (!company_name || typeof company_name !== 'string') {
            throw new Error('Valid company name is required');
        }
        if (contact_email && !validateInput.isValidEmail(contact_email)) {
            throw new Error('Valid email address is required');
        }

        // Sanitize inputs
        const sanitizedData = {
            company_name: validateInput.sanitizeString(company_name, 100),
            company_description: validateInput.sanitizeString(company_description, 500),
            contact_phone: validateInput.sanitizeString(contact_phone, 20),
            contact_email: validateInput.sanitizeString(contact_email, 100),
            contact_address: validateInput.sanitizeString(contact_address, 255),
            copyright_text: validateInput.sanitizeString(copyright_text, 100)
        };

        await executeQueryWithRetry({
            query: `
          UPDATE footer_config 
          SET company_name = ?, company_description = ?, contact_phone = ?, 
              contact_email = ?, contact_address = ?, copyright_text = ?
          WHERE id = (SELECT id FROM (SELECT id FROM footer_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1) as temp)
        `,
            values: [
                sanitizedData.company_name,
                sanitizedData.company_description,
                sanitizedData.contact_phone,
                sanitizedData.contact_email,
                sanitizedData.contact_address,
                sanitizedData.copyright_text
            ]
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating footer config:', error);
        throw new Error(error.message || 'Failed to update footer config');
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
    console.error('Footer config API error:', error);

    const statusMap = {
        [CONFIG.ERRORS.UNAUTHORIZED]: 401,
        [CONFIG.ERRORS.MISSING_CONTENT]: 400
    };

    const status = statusMap[error.message] || 500;
    const message = statusMap[error.message] ? error.message : 'Internal server error';

    return respond({ error: message }, status);
};

export async function PUT(req) {
    try {
        const user = await auth.getUser();

        if (!await auth.canManageFooter(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }

        const configData = await req.json();

        if (!configData.company_name) {
            throw new Error(CONFIG.ERRORS.MISSING_CONTENT);
        }

        const result = await updateConfig(configData);
        return respond(result);
    } catch (error) {
        return handleError(error);
    }
}
