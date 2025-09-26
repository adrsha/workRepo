// /api/[entityType]/[entityId]/users.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

export async function GET(request) {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only allow admins to see user lists
    if (session.user.level < 1) {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const entityType = pathParts[2]; // /api/[entityType]/[entityId]/users
    const entityId = pathParts[3];

    if (!entityType || !entityId) {
        return Response.json({ error: 'Entity type and ID are required' }, { status: 400 });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        let query;
        let params;

        // Get users based on entity type
        switch (entityType) {
            case 'classes':
                // Get students enrolled in the class
                query = `
                    SELECT DISTINCT u.user_id, u.user_name, u.email, u.level
                    FROM users u
                    INNER JOIN class_enrollments ce ON u.user_id = ce.user_id
                    WHERE ce.class_id = ? AND u.level = 0
                    ORDER BY u.user_name
                `;
                params = [entityId];
                break;
                
            case 'courses':
                // Get users who have access to the course (enrolled students)
                query = `
                    SELECT DISTINCT u.user_id, u.user_name, u.email, u.level
                    FROM users u
                    WHERE u.level = 0
                    ORDER BY u.user_name
                `;
                params = [];
                break;
                
            case 'lectures':
                // Get users from the parent course/class
                query = `
                    SELECT DISTINCT u.user_id, u.user_name, u.email, u.level
                    FROM users u
                    WHERE u.level = 0
                    ORDER BY u.user_name
                `;
                params = [];
                break;
                
            default:
                return Response.json({ error: 'Unsupported entity type' }, { status: 400 });
        }

        const [users] = await connection.execute(query, params);
        
        return Response.json(users);

    } catch (error) {
        console.error('Database error:', error);
        return Response.json(
            { error: 'Failed to fetch users' }, 
            { status: 500 }
        );
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}
