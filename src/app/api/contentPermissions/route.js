// /api/contentPermissions/route.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch current permissions and available users for a content item
export async function GET(request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const contentId = searchParams.get('contentId');
        const entityType = searchParams.get('entityType');
        const entityId = searchParams.get('entityId');

        let currentPermissions = [];

        if (contentId) {
            // Get current permissions for this content
            currentPermissions = await executeQueryWithRetry({
                query: `
                    SELECT 
                        cup.permission_id,
                        cup.user_id,
                        u.user_name,
                        u.user_email,
                        u.user_level,
                        cup.granted_at,
                        granter.user_name as granted_by_name
                    FROM content_user_permissions cup
                    JOIN users u ON cup.user_id = u.user_id
                    LEFT JOIN users granter ON cup.granted_by = granter.user_id
                    WHERE cup.content_id = ?
                    ORDER BY u.user_name
                `,
                values: [contentId]
            });
        }

        // Always fetch available users
        let availableUsersQuery = `
            SELECT user_id, user_name, user_email, user_level
            FROM users 
            WHERE user_level >= 0 AND user_id != ?
            ORDER BY user_name
        `;
        let queryValues = [session.user.id];

        if (entityType && entityId) {
            // 🔧 optional future filter by entity
        }

        const availableUsers = await executeQueryWithRetry({
            query: availableUsersQuery,
            values: queryValues
        });

        return NextResponse.json({
            success: true,
            currentPermissions,
            availableUsers
        });

    } catch (error) {
        console.error('Error fetching content permissions:', error);
        return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
    }
}

// POST - Update permissions for a content item
export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    try {
        const { contentId, userIds, entityType, entityId } = await request.json();

        if (!contentId || !Array.isArray(userIds)) {
            return NextResponse.json({ 
                error: 'Content ID and user IDs array are required' 
            }, { status: 400 });
        }

        // Optional: Validate that content exists and belongs to the entity
        if (entityType && entityId) {
            const tableMap = {
                'quiz': 'quiz_content',
                'notice': 'notices_content',
                // Add other entity types as needed
            };

            const table = tableMap[entityType];
            if (table) {
                const contentExists = await executeQueryWithRetry({
                    query: `
                        SELECT COUNT(*) as count 
                        FROM ${table} ec
                        JOIN content c ON ec.content_id = c.content_id
                        WHERE c.content_id = ? AND ec.${entityType}_id = ?
                    `,
                    values: [contentId, entityId]
                });

                if (contentExists[0].count === 0) {
                    return NextResponse.json({ 
                        error: 'Content not found or does not belong to this entity' 
                    }, { status: 404 });
                }
            }
        }

        // Start transaction by removing existing permissions
        await executeQueryWithRetry({
            query: 'DELETE FROM content_user_permissions WHERE content_id = ?',
            values: [contentId]
        });

        // Insert new permissions if any users are selected
        if (userIds.length > 0) {
            const values = userIds.map(userId => [
                contentId, 
                userId, 
                entityType || null,
                entityId || null,
                session.user.id
            ]);

            const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
            const flatValues = values.flat();

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
            message: `Permissions updated for ${userIds.length} user${userIds.length !== 1 ? 's' : ''}`
        });

    } catch (error) {
        console.error('Error updating content permissions:', error);
        return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
    }
}

// DELETE - Remove all permissions for a content item
export async function DELETE(request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const contentId = searchParams.get('contentId');

        if (!contentId) {
            return NextResponse.json({ 
                error: 'Content ID is required' 
            }, { status: 400 });
        }

        await executeQueryWithRetry({
            query: 'DELETE FROM content_user_permissions WHERE content_id = ?',
            values: [contentId]
        });

        return NextResponse.json({ 
            success: true,
            message: 'All permissions removed for this content'
        });

    } catch (error) {
        console.error('Error removing content permissions:', error);
        return NextResponse.json({ error: 'Failed to remove permissions' }, { status: 500 });
    }
}
