import { executeQueryWithRetry } from '../../lib/db'
import { authOptions } from "../auth/[...nextauth]/authOptions"
import { getServerSession } from 'next-auth/next';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

export async function POST(req) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized access' }), { status: 401 });
        }
        const userId = session.user.id;

        // Parse form data
        const formData = await req.formData();
        const file = formData.get('screenshot');

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return new Response(JSON.stringify({ error: 'Only image files are allowed' }), { status: 400 });
        }

        // Create upload directory
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const fileExtension = extname(file.name) || '.jpg';
        const filename = `payment-${userId}-${Date.now()}${fileExtension}`;
        const filePath = join(uploadDir, filename);

        // Convert file to buffer and save
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filePath, buffer);
        // Save file info to database
        const query = `
            INSERT INTO class_joining_pending (user_id, class_id, screenshot_path) 
            VALUES (?, ?, ?)
        `;

        // Assuming class_id is available in the form data
        const classId = formData.get('class_id'); // Make sure to get class_id from the form data

        if (userId == undefined || classId == undefined || filename == undefined) {
            return new Response(JSON.stringify({ error: 'Undefined values for userId, classId or relativePath' }), { status: 400 });
        }

        await executeQueryWithRetry({
            query,
            values: [userId, classId, `/uploads/${filename}`]
        });

        return new Response(JSON.stringify({
            success: true,
        }), { status: 200 });

    } catch (error) {
        console.error('Upload failed:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

