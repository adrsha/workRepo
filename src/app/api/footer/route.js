export const dynamic = 'force-dynamic';
import { executeQueryWithRetry } from '../../lib/db';

async function getFooterData() {
    try {
        // Get config
        const configResult = await executeQueryWithRetry({
            query: 'SELECT * FROM footer_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1',
            values: []
        });

        // Get sections with their links
        const sectionsResult = await executeQueryWithRetry({
            query: `
          SELECT 
            s.id,
            s.title,
            s.display_order,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', l.id,
                'title', l.title,
                'url', l.url,
                'display_order', l.display_order
              )
            ) as links
          FROM footer_sections s
          LEFT JOIN footer_links l ON s.id = l.section_id AND l.is_active = 1
          WHERE s.is_active = 1
          GROUP BY s.id, s.title, s.display_order
          ORDER BY s.display_order
        `,
            values: []
        });

        // Get social links
        const socialResult = await executeQueryWithRetry({
            query: `
          SELECT id, platform, url, icon_svg, display_order
          FROM footer_social_links
          WHERE is_active = 1
          ORDER BY display_order
        `,
            values: []
        });

        // Parse sections data safely
        const sections = sectionsResult.map(section => ({
            ...section,
            links: section.links ? JSON.parse(section.links).filter(link => link.id !== null) : []
        }));

        return {
            config: configResult[0] || null,
            sections,
            socialLinks: socialResult
        };
    } catch (error) {
        console.error('Error fetching footer data:', error);
        throw new Error('Failed to fetch footer data');
    }
}

const respond = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });

const handleError = (error) => {
    console.error('Footer API error:', error);
    return respond({ error: error.message }, 500);
};

export async function GET() {
    try {
        const footerData = await getFooterData();
        return respond(footerData);
    } catch (error) {
        return handleError(error);
    }
}
