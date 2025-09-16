// app/api/advertisements/route.js
import { executeQueryWithRetry } from '../../lib/db';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { getServerSession } from 'next-auth/next';

// GET - Fetch all advertisements
export async function GET(req) {
    try {
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
            WHERE is_active = 1
            ORDER BY created_at DESC
        `;

        const advertisements = await executeQueryWithRetry({ query });

        return new Response(JSON.stringify(advertisements), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching advertisements:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500 
        });
    }
}

// POST - Create new advertisement
export async function POST(req) {
    try {
        // Check authentication for admin
        const session = await getServerSession(authOptions);
        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), { 
                status: 401 
            });
        }

        const formData = await req.formData();
        const title = formData.get('title');
        const description = formData.get('description');
        const link = formData.get('link');
        const image = formData.get('image');
        const imagePath = formData.get('imagePath'); // For pre-uploaded images

        // Validate required fields
        if (!title || !link) {
            return new Response(JSON.stringify({ 
                error: 'Title and link are required' 
            }), { status: 400 });
        }

        let finalImagePath = null;

        // Handle image - either new upload or existing path
        if (imagePath) {
            // Use existing uploaded image path
            finalImagePath = imagePath;
        } else if (image && image.size > 0) {
            // Handle new image upload
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('file', image);
                uploadFormData.append('parentId', 'advertisements');
                uploadFormData.append('parentType', 'advertisements');
                uploadFormData.append('isSignupForm', 'false');

                const uploadResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/upload`, {
                    method: 'POST',
                    body: uploadFormData,
                });

                if (!uploadResponse.ok) {
                    const uploadError = await uploadResponse.json();
                    throw new Error(uploadError.error || 'Image upload failed');
                }

                const uploadResult = await uploadResponse.json();
                finalImagePath = uploadResult.filePath;
            } catch (uploadError) {
                return new Response(JSON.stringify({ 
                    error: `Image upload failed: ${uploadError.message}` 
                }), { status: 400 });
            }
        }

        // Insert into database
        const query = `
            INSERT INTO advertisements (title, description, image_path, link, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, 1, NOW(), NOW())
        `;

        const result = await executeQueryWithRetry({
            query,
            values: [title, description, finalImagePath, link]
        });

        // Fetch the newly created advertisement
        const newAdQuery = `
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

        const newAdvertisement = await executeQueryWithRetry({
            query: newAdQuery,
            values: [result.insertId]
        });

        return new Response(JSON.stringify(newAdvertisement[0]), { 
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error creating advertisement:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500 
        });
    }
}
