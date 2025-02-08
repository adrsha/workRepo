import { executeQueryWithRetry } from '../../lib/db';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        const results = await executeQueryWithRetry({
            query: `SELECT ccr.unique_course_id, ccr.class_id, cl.class_name, c.*, ccr.teacher_id, u.user_name AS teacher_name 
                    FROM classes_courses_relational ccr
                    JOIN users_courses_relational ucr ON ccr.unique_course_id=ucr.unique_course_id 
                    JOIN courses c ON ccr.course_id = c.course_id
                    JOIN users u ON u.user_id = ccr.teacher_id
                    JOIN classes cl ON cl.class_id = ccr.class_id
                    WHERE ucr.user_id = ?`,
            values: [userId],
        });

        return Response.json(results);
    } catch (error) {
        console.error('Database query failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
