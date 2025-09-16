// app/api/advertisements/[id]/route.js
import { executeQueryWithRetry } from '../../../lib/db';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { getServerSession } from 'next-auth/next';

// GET - Fetch single advertisement
export async function GET(req, { params }) {
    try {
        const { id } = params;

        const query = `
            SELECT 
                id,
                title,
                description,
                image_path as image,
                link,
                is_active,
                created_at,
                updated_at
            FROM advertisements 
            WHERE id = ? AND is_active = 1
        `;

        const advertisement = await executeQueryWithRetry({
            query  : query,
            values : [id]
        });

        if (!advertisement.length) {
            return new Response(JSON.stringify({ error: 'Advertisement not found' }), { 
                status: 404 
            });
        }

        return new Response(JSON.stringify(advertisement[0]), { 
            status  : 200,
            headers : { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching advertisement:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500 
        });
    }
}

// PUT - Update advertisement
export async function PUT(req, { params }) {
    try {
        // Check authentication for admin
        const session = await getServerSession(authOptions);
        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), { 
                status: 401 
            });
        }

        // Check if user is admin (adjust based on your auth structure)
        // if (session.user.role !== 'admin') {
        //     return new Response(JSON.stringify({ error: 'Admin access required' }), { 
        //         status: 403 
        //     });
        // }

        const { id }      = params;
        const formData    = await req.formData();
        const title       = formData.get('title');
        const description = formData.get('description');
        const link        = formData.get('link');
        const image       = formData.get('image');

        // Validate required fields
        if (!title || !link) {
            return new Response(JSON.stringify({ 
                error: 'Title and link are required' 
            }), { status: 400 });
        }

        // Get current advertisement data
        const currentAdQuery = `
            SELECT image_path 
            FROM advertisements 
            WHERE id = ?
        `;
        
        const currentAd = await executeQueryWithRetry({
            query  : currentAdQuery,
            values : [id]
        });

        if (!currentAd.length) {
            return new Response(JSON.stringify({ error: 'Advertisement not found' }), { 
                status: 404 
            });
        }

        let imagePath = currentAd[0].image_path;

        // Handle image upload using existing upload system
        if (image && image.size > 0) {
            try {
                // Delete old image first if it exists
                if (imagePath) {
                    try {
                        await fetch('/api/upload', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filePath: imagePath })
                        });
                    } catch (deleteError) {
                        console.warn('Failed to delete old image:', deleteError.message);
                    }
                }

                const uploadFormData = new FormData();
                uploadFormData.append('file', image);
                uploadFormData.append('parentId', 'advertisements');
                uploadFormData.append('parentType', 'advertisements');
                uploadFormData.append('isSignupForm', 'false');

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData,
                });

                if (!uploadResponse.ok) {
                    const uploadError = await uploadResponse.json();
                    throw new Error(uploadError.error || 'Image upload failed');
                }

                const uploadResult = await uploadResponse.json();
                imagePath = uploadResult.filePath;
            } catch (uploadError) {
                return new Response(JSON.stringify({ 
                    error: `Image upload failed: ${uploadError.message}` 
                }), { status: 400 });
            }
        }

        // Update database
        const updateQuery = `
            UPDATE advertisements 
            SET title = ?, description = ?, image_path = ?, link = ?, updated_at = NOW()
            WHERE id = ?
        `;

        await executeQueryWithRetry({
            query  : updateQuery,
            values : [title, description, imagePath, link, id]
        });

        // Fetch updated advertisement
        const updatedAdQuery = `
            SELECT 
                id,
                title,
                description,
                image_path as image,
                link,
                is_active,
                created_at,
                updated_at
            FROM advertisements 
            WHERE id = ?
        `;

        const updatedAdvertisement = await executeQueryWithRetry({
            query  : updatedAdQuery,
            values : [id]
        });

        return new Response(JSON.stringify(updatedAdvertisement[0]), { 
            status  : 200,
            headers : { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error updating advertisement:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500 
        });
    }
}

// DELETE - Soft delete advertisement
export async function DELETE(req, { params }) {
    try {
        // Check authentication for admin
        const session = await getServerSession(authOptions);
        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), { 
                status: 401 
            });
        }

        // Check if user is admin (adjust based on your auth structure)
        // if (session.user.role !== 'admin') {
        //     return new Response(JSON.stringify({ error: 'Admin access required' }), { 
        //         status: 403 
        //     });
        // }

        const { id } = params;

        // Soft delete (set is_active = 0)
        const deleteQuery = `
            UPDATE advertisements 
            SET is_active = 0, updated_at = NOW()
            WHERE id = ?
        `;

        const result = await executeQueryWithRetry({
            query  : deleteQuery,
            values : [id]
        });

        if (result.affectedRows === 0) {
            return new Response(JSON.stringify({ error: 'Advertisement not found' }), { 
                status: 404 
            });
        }

        return new Response(JSON.stringify({ success: true }), { 
            status  : 200,
            headers : { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error deleting advertisement:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500 
        });
    }
}
