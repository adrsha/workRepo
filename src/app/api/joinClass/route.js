import { executeQueryWithRetry } from '../../lib/db';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/authOptions';

export async function POST(req) {
    try {
        // const session = await getSession({ req });
        const session = await getServerSession(authOptions);

        // Ensure the user is authenticated
        if (!session || !session.accessToken) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
        }

        // Get the classId and userId from the request body
        const { classId, userId } = await req.json();

        // Ensure that the userId from the session matches the provided userId
        if (session.user.id !== userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User mismatch' }), { status: 403 });
        }
        // Ensure that the userLevel is only 0 (student)
        
        if (session.user.level !== 0) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User level mismatch' }), { status: 403 });
        }

        // Your logic to handle joining the class (e.g., database update)
        //
        const responseJoin = await joinClassInDatabase(classId, userId);
        if (!responseJoin) {
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
        } else {            
            return new Response(JSON.stringify({ success: 'User joined the class successfully' }), { status: 200 });
        }
    } catch (error) {
        console.error('Error joining class:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}

async function joinClassInDatabase(classId, userId) {
    // Validate input
    if (!classId || !userId) {
        return NextResponse.json({ error: 'Class ID and user ID are required' }, { status: 400 });
    }

    const enrolledClasses = await executeQueryWithRetry({
        query: `SELECT * FROM classes_users 
                    JOIN users ON users.user_id = classes_users.user_id
                    JOIN classes ON classes.class_id = classes_users.class_id
                    WHERE users.user_id = ? AND classes.class_id = ?`,
        values: [userId, classId],
    });

    if (enrolledClasses.length > 0) {
        return NextResponse.json({ error: 'User is already enrolled in the class', success: false }, { status: 400 });
    } else {
        return await executeQueryWithRetry({
            query: `INSERT INTO classes_users (class_id, user_id) VALUES (?, ?)`,
            values: [classId, userId],
            success: true,
        });
    }
}
