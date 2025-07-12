import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';
import { CONFIG } from '../../../constants/config';

const auth = {
    async getUser() {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        return session.user;
    },
    async canManageCarousel(userLevel) {
        return userLevel === CONFIG.USER_LEVELS.ADMIN;
    }
};

const db = {
    async getAllCarouselImages() {
        const result = await executeQueryWithRetry({
            query: `
                SELECT hero_carousel_id as id, hero_carousel_caption as caption, 
                       hero_carousel_img as src, hero_carousel_alt as alt,
                       hero_carousel_description as description,
                       hero_carousel_order as order_index
                FROM hero_carousel 
                ORDER BY hero_carousel_order ASC, hero_carousel_id ASC
            `,
            values: []
        });
        return result;
    },
    
    async createCarouselImage(imageData) {
        const { src, alt, description, caption } = imageData;
        
        // Get the next order index
        const orderResult = await executeQueryWithRetry({
            query: 'SELECT COALESCE(MAX(hero_carousel_order), 0) + 1 as next_order FROM hero_carousel',
            values: []
        });
        const nextOrder = orderResult[0].next_order;
        
        const result = await executeQueryWithRetry({
            query: `
                INSERT INTO hero_carousel 
                (hero_carousel_caption, hero_carousel_img, hero_carousel_alt, hero_carousel_description, hero_carousel_order) 
                VALUES (?, ?, ?, ?, ?)
            `,
            values: [caption || '', src, alt || '', description || '', nextOrder]
        });
        
        return result.insertId;
    },
    
    async updateCarouselImage(id, imageData) {
        const { alt, description, caption } = imageData;
        
        const result = await executeQueryWithRetry({
            query: `
                UPDATE hero_carousel 
                SET hero_carousel_alt = ?, hero_carousel_description = ?, hero_carousel_caption = ?
                WHERE hero_carousel_id = ?
            `,
            values: [alt || '', description || '', caption || '', id]
        });
        
        return result.affectedRows > 0;
    },
    
    async deleteCarouselImage(id) {
        const result = await executeQueryWithRetry({
            query: 'DELETE FROM hero_carousel WHERE hero_carousel_id = ?',
            values: [id]
        });
        
        return result.affectedRows > 0;
    },
    
    async reorderCarouselImages(imageIds) {
        // Update order for all images
        const promises = imageIds.map((id, index) => 
            executeQueryWithRetry({
                query: 'UPDATE hero_carousel SET hero_carousel_order = ? WHERE hero_carousel_id = ?',
                values: [index + 1, id]
            })
        );
        
        await Promise.all(promises);
        return true;
    }
};

const validate = {
    createImage(body) {
        const { src, alt, description, caption } = body;
        if (!src) throw new Error('Image source is required');
        return { src, alt, description, caption };
    },
    
    updateImage(body) {
        const { alt, description, caption } = body;
        return { alt, description, caption };
    },
    
    reorderImages(body) {
        const { imageIds } = body;
        if (!Array.isArray(imageIds)) throw new Error('Image IDs must be an array');
        return { imageIds };
    }
};

const respond = (data, status = 200) => 
    new Response(JSON.stringify(data), { 
        status, 
        headers: { 'Content-Type': 'application/json' } 
    });

const handleError = (error) => {
    console.error('Carousel API error:', error);
    
    const statusMap = {
        [CONFIG.ERRORS.UNAUTHORIZED]: 401,
        [CONFIG.ERRORS.DB_FAILED]: 500
    };
    
    const status = statusMap[error.message] || 500;
    const message = statusMap[error.message] ? error.message : CONFIG.ERRORS.INTERNAL;
    
    return respond({ error: message }, status);
};

// GET - Fetch all carousel images (public endpoint)
export async function GET(req) {
    try {
        const images = await db.getAllCarouselImages();
        return respond({ images });
    } catch (error) {
        return handleError(error);
    }
}

// POST - Create new carousel image (admin only)
export async function POST(req) {
    try {
        const user = await auth.getUser();
        
        if (!await auth.canManageCarousel(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }
        
        const imageData = validate.createImage(await req.json());
        const imageId = await db.createCarouselImage(imageData);
        
        return respond({ success: true, imageId });
    } catch (error) {
        return handleError(error);
    }
}

// PUT - Update carousel image or reorder images (admin only)
export async function PUT(req) {
    try {
        const user = await auth.getUser();
        
        if (!await auth.canManageCarousel(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }
        
        const body = await req.json();
        const { searchParams } = new URL(req.url);
        const imageId = searchParams.get('id');
        const action = searchParams.get('action');
        
        if (action === 'reorder') {
            const { imageIds } = validate.reorderImages(body);
            await db.reorderCarouselImages(imageIds);
            return respond({ success: true });
        } else if (imageId) {
            const imageData = validate.updateImage(body);
            const updated = await db.updateCarouselImage(imageId, imageData);
            
            if (!updated) {
                return respond({ error: 'Image not found' }, 404);
            }
            
            return respond({ success: true });
        } else {
            return respond({ error: 'Invalid request' }, 400);
        }
    } catch (error) {
        return handleError(error);
    }
}

// DELETE - Delete carousel image (admin only)
export async function DELETE(req) {
    try {
        const user = await auth.getUser();
        
        if (!await auth.canManageCarousel(user.level)) {
            throw new Error(CONFIG.ERRORS.UNAUTHORIZED);
        }
        
        const { searchParams } = new URL(req.url);
        const imageId = searchParams.get('id');
        
        if (!imageId) {
            return respond({ error: 'Image ID is required' }, 400);
        }
        
        const deleted = await db.deleteCarouselImage(imageId);
        
        if (!deleted) {
            return respond({ error: 'Image not found' }, 404);
        }
        
        return respond({ success: true });
    } catch (error) {
        return handleError(error);
    }
}
