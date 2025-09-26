// /api/quizzesContent/[quizId]/route.js - Updated to show title for restricted content
import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    const { quizId } = await params;
    
    try {
        // Get quiz content with permission information
        const quizContent = await executeQueryWithRetry({
            query: `
                SELECT
                    q.quiz_id,
                    q.quiz_title,
                    q.quiz_date_time,
                    c.content_id,
                    c.content_type,
                    c.content_data,
                    c.created_at,
                    c.is_public,
                    qc.price,
                    -- Get users who have permission to this content
                    GROUP_CONCAT(DISTINCT CONCAT(u.user_id, ':', u.user_name) SEPARATOR '|') as authorized_users_info,
                    -- Check if current user has permission
                    CASE 
                        WHEN c.is_public = 1 THEN 1
                        WHEN ? IS NULL THEN 0
                        WHEN EXISTS (
                            SELECT 1 FROM content_user_permissions cup 
                            WHERE cup.content_id = c.content_id AND cup.user_id = ?
                        ) THEN 1
                        ELSE 0
                    END as user_has_access
                FROM quizzes q
                LEFT JOIN quiz_content qc ON q.quiz_id = qc.quiz_id
                LEFT JOIN content c ON qc.content_id = c.content_id
                LEFT JOIN content_user_permissions cup ON c.content_id = cup.content_id
                LEFT JOIN users u ON cup.user_id = u.user_id
                WHERE q.quiz_id = ?
                GROUP BY q.quiz_id, c.content_id
                ORDER BY c.created_at DESC
            `,
            values: [session?.user?.id || null, session?.user?.id || null, quizId],
        });

        if (!quizContent || quizContent.length === 0) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // Helper function to extract title from content_data
        const extractTitleFromContent = (contentData) => {
            if (!contentData) return null;
            try {
                const parsed = JSON.parse(contentData);
                return parsed.title || 'Untitled Content';
            } catch (error) {
                return 'Content Available';
            }
        };

        // Filter content based on user permissions
        const filteredContent = quizContent.map(row => {
            // If no content, return as is
            if (!row.content_id) {
                return {
                    ...row,
                    authorized_users: []
                };
            }

            const baseData = {
                quiz_id: row.quiz_id,
                quiz_title: row.quiz_title,
                quiz_date_time: row.quiz_date_time,
                content_id: row.content_id,
                content_type: row.content_type,
                created_at: row.created_at,
                is_public: row.is_public,
                price: row.price,
                authorized_users: row.authorized_users_info ? 
                    row.authorized_users_info.split('|').map(userInfo => {
                        const [id, name] = userInfo.split(':');
                        return { user_id: parseInt(id), user_name: name };
                    }) : []
            };

            // Admin users get full access
            if (session?.user?.level >= 2) {
                return {
                    ...baseData,
                    content_data: row.content_data,
                    user_has_access: 1
                };
            }
            // Check if user has access (public content or specific permission)
            if (row.user_has_access) {
                return {
                    ...baseData,
                    content_data: row.content_data,
                    user_has_access: 1,
                    // Only show authorized users to admins
                    authorized_users: session?.user?.level >= 1 ? baseData.authorized_users : []
                };
            }

            // User doesn't have access - show title only for preview
            return {
                ...baseData,
                content_data: JSON.stringify({
                    title:extractTitleFromContent(row.content_data),
                    preview: true,
                    originalType: row.content_type
                }),
                user_has_access: 0,
                authorized_users: [] // Don't show authorized users to non-admin users
            };
        });

        // Remove duplicate quiz entries and ensure at least one quiz info entry exists
        const hasContent = filteredContent.some(item => item.content_id);
        
        if (!hasContent) {
            // Return just the quiz info if no content exists
            return NextResponse.json([{
                quiz_id: quizContent[0].quiz_id,
                quiz_title: quizContent[0].quiz_title,
                quiz_date_time: quizContent[0].quiz_date_time,
                content_id: null,
                content_type: null,
                content_data: null,
                created_at: null,
                is_public: null,
                authorized_users: [],
                user_has_access: 0
            }]);
        }

        return NextResponse.json(filteredContent);
    } catch (error) {
        console.error('Error fetching quiz content:', error);
        return NextResponse.json({ error: 'Failed to fetch quiz content' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await params;

    try {
        const { contentId } = await request.json();

        if (!contentId) {
            return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
        }

        // Get content data including file path before deletion
        const contentData = await executeQueryWithRetry({
            query: `
                SELECT c.content_id, c.content_data
                FROM content c
                JOIN quiz_content qc ON c.content_id = qc.content_id
                WHERE c.content_id = ? AND qc.quiz_id = ?
            `,
            values: [contentId, quizId]
        });

        if (!contentData || contentData.length === 0) {
            return NextResponse.json({ 
                error: 'Content not found or does not belong to this quiz' 
            }, { status: 404 });
        }

        // Extract file path from content data
        let filePath = null;
        try {
            const parsedData = JSON.parse(contentData[0].content_data);
            filePath = parsedData?.filePath;
        } catch (parseError) {
            console.warn('Could not parse content_data for file path extraction:', parseError);
        }

        // Check if content is used elsewhere before deleting
        const contentUsage = await executeQueryWithRetry({
            query: `
                SELECT COUNT(*) as count 
                FROM quiz_content 
                WHERE content_id = ?
                UNION ALL
                SELECT COUNT(*) as count 
                FROM notices_content 
                WHERE content_id = ?
            `,
            values: [contentId, contentId]
        });

        const totalUsage = contentUsage.reduce((sum, row) => sum + row.count, 0);

        // Delete the connection first
        await executeQueryWithRetry({
            query: `DELETE FROM quiz_content WHERE content_id = ? AND quiz_id = ?`,
            values: [contentId, quizId]
        });

        // Only delete content and permissions if not used elsewhere
        if (totalUsage === 1) { // Only this quiz was using it
            // Delete content permissions first (foreign key constraint)
            await executeQueryWithRetry({
                query: `DELETE FROM content_user_permissions WHERE content_id = ?`,
                values: [contentId]
            });

            // Delete content
            await executeQueryWithRetry({
                query: `DELETE FROM content WHERE content_id = ?`,
                values: [contentId]
            });

            // Delete the associated file if it exists
            if (filePath) {
                try {
                    const fullPath = path.join(process.cwd(), 'public', filePath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        console.log('File deleted successfully:', filePath);
                    } else {
                        console.warn('File not found on filesystem:', filePath);
                    }
                } catch (fileError) {
                    console.error('Error deleting file:', fileError);
                    // Continue with success response even if file deletion fails
                }
            }
        } else {
            // Just remove permissions for this specific entity context
            await executeQueryWithRetry({
                query: `
                    DELETE FROM content_user_permissions 
                    WHERE content_id = ? AND entity_type = 'quiz' AND entity_id = ?
                `,
                values: [contentId, quizId]
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Content deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting content:', error);
        return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
    }
}
