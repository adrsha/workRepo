// /api/contentPermissions/assign/route.js
import { getServerSession } from 'next-auth';
import { toSingular } from '@/utils/entityUtils';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    try {
        const { contentId, userIds, entityType, entityId } = await request.json();

        if (!contentId || !userIds || !Array.isArray(userIds) || !entityType || !entityId) {
            return NextResponse.json({ 
                error: 'Content ID, user IDs array, entity type, and entity ID are required' 
            }, { status: 400 });
        }

        // Validate that content exists and belongs to the entity
        const contentExists = await executeQueryWithRetry({
            query: `
                SELECT COUNT(*) as count 
                FROM ${entityType === 'quizzes' ? 'quiz_content qc' : 'notices_content nc'}
                JOIN content c ON ${entityType === 'quizzes' ? 'qc' : 'nc'}.content_id = c.content_id
                WHERE c.content_id = ? AND ${entityType === 'quizzes' ? 'qc.quiz_id' : 'nc.notice_id'} = ?
            `,
            values: [contentId, entityId]
        });

        if (contentExists[0].count === 0) {
            return NextResponse.json({ 
                error: 'Content not found or does not belong to this entity' 
            }, { status: 404 });
        }

        // Remove existing permissions for this content to avoid conflicts
        await executeQueryWithRetry({
            query: 'DELETE FROM content_user_permissions WHERE content_id = ?',
            values: [contentId]
        });

        // Insert new permissions
        if (userIds.length > 0) {
            const values = userIds.map(userId => [
                contentId, 
                userId.user_id ? userId.user_id : userId, 
                toSingular(entityType),
                entityId, 
                session.user.id
            ]);

            const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
            const flatValues = values.flat();
            console.log(flatValues, values, userIds)
            await executeQueryWithRetry({
                query: `
                    INSERT INTO content_user_permissions 
                    (content_id, user_id, entity_type, entity_id, granted_by) 
                    VALUES ${placeholders}
                `,
                values: flatValues
            });
        }

        return NextResponse.json({ 
            success: true,
            message: `Permissions assigned to ${userIds.length} users`
        });

    } catch (error) {
        console.error('Error assigning content permissions:', error);
        return NextResponse.json({ error: 'Failed to assign permissions' }, { status: 500 });
    }
}
