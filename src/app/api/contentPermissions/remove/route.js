// /api/contentPermissions/remove/route.js
export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    try {
        const { contentId, userIds } = await request.json();

        if (!contentId || !userIds || !Array.isArray(userIds)) {
            return NextResponse.json({ 
                error: 'Content ID and user IDs array are required' 
            }, { status: 400 });
        }

        if (userIds.length > 0) {
            const placeholders = userIds.map(() => '?').join(', ');
            
            await executeQueryWithRetry({
                query: `
                    DELETE FROM content_user_permissions 
                    WHERE content_id = ? AND user_id IN (${placeholders})
                `,
                values: [contentId, ...userIds]
            });
        }

        return NextResponse.json({ 
            success: true,
            message: `Permissions removed from ${userIds.length} users`
        });

    } catch (error) {
        console.error('Error removing content permissions:', error);
        return NextResponse.json({ error: 'Failed to remove permissions' }, { status: 500 });
    }
}
