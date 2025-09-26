// /api/quizContent/save/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || session.user.level < 1) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { quizId, contentType, contentData, isPublic = false, authorizedUsers = [], price = 0 } = body;

        // Validation
        if (!quizId) {
            return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
        }
        
        if (!contentType || !contentData) {
            return NextResponse.json({ error: 'Content type and data are required' }, { status: 400 });
        }

        // Validate authorized users array
        if (authorizedUsers && (!Array.isArray(authorizedUsers) || !authorizedUsers.every(id => Number.isInteger(id)))) {
            return NextResponse.json({ error: 'Authorized users must be an array of user IDs' }, { status: 400 });
        }

        // Validate price
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return NextResponse.json({ error: 'Price must be a valid non-negative number' }, { status: 400 });
        }

        // Build content data based on type
        let finalContentData;
        finalContentData = {
            ...contentData,
            isFile: true,
            uploadedBy: session.user.id
        };

        // Save content to database
        const contentResult = await executeQueryWithRetry({
            query: `INSERT INTO content (content_type, content_data, is_public) VALUES (?, ?, ?)`,
            values: [contentType, JSON.stringify(finalContentData), isPublic ? 1 : 0]
        });

        const contentId = contentResult.insertId;

        // Link content to quiz with price
        await executeQueryWithRetry({
            query: `INSERT INTO quiz_content (quiz_id, content_id, price) VALUES (?, ?, ?)`,
            values: [quizId, contentId, parsedPrice]
        });

        // Handle user permissions if not public and authorized users are specified
        if (!isPublic && authorizedUsers.length > 0) {
            // Insert permissions for each authorized user
            const permissionPromises = authorizedUsers.map(userId => 
                executeQueryWithRetry({
                    query: `INSERT INTO content_user_permissions (content_id, user_id) VALUES (?, ?)`,
                    values: [contentId, userId]
                })
            );
            
            await Promise.all(permissionPromises);
        }

        // Fetch the created content with all details
        const savedContent = await executeQueryWithRetry({
            query: `
                SELECT 
                    c.content_id,
                    c.content_type,
                    c.content_data,
                    c.created_at,
                    c.is_public,
                    qc.price,
                    GROUP_CONCAT(DISTINCT CONCAT(u.user_id, ':', u.user_name) SEPARATOR '|') as authorized_users_info
                FROM content c
                JOIN quiz_content qc ON c.content_id = qc.content_id
                LEFT JOIN content_user_permissions cup ON c.content_id = cup.content_id
                LEFT JOIN users u ON cup.user_id = u.user_id
                WHERE c.content_id = ? AND qc.quiz_id = ?
                GROUP BY c.content_id
            `,
            values: [contentId, quizId]
        });

        if (!savedContent.length) {
            return NextResponse.json({ error: 'Failed to retrieve saved content' }, { status: 500 });
        }

        const result = savedContent[0];
        
        // Parse content data and format response
        let parsedContentData = {};
        try {
            parsedContentData = JSON.parse(result.content_data);
        } catch (error) {
            console.error('Failed to parse saved content data:', error);
        }

        // Format authorized users
        const authorizedUsersFormatted = result.authorized_users_info ? 
            result.authorized_users_info.split('|').map(userInfo => {
                const [id, name] = userInfo.split(':');
                return { user_id: parseInt(id), user_name: name };
            }) : [];

        const response = {
            content_id: result.content_id,
            content_type: result.content_type,
            created_at: result.created_at,
            is_public: result.is_public,
            price: result.price,
            authorized_users: authorizedUsersFormatted,
            ...parsedContentData
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error saving quiz content:', error);
        return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
    }
}
