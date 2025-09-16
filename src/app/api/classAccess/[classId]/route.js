// /app/api/classAccess/[classId]/route.js
import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { classId } = await params;
    const userId = session.user.id;
    const userLevel = session.user.level;

    if (!classId) {
        return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    try {
        // Check if class exists and get basic info
        const classQuery = `
            SELECT class_id, teacher_id, course_name, grade_name, course_details, start_time, end_time, repeat_every_n_day, meeting_url
            FROM classes_view 
            WHERE class_id = ?
        `;
        
        const classData = await executeQueryWithRetry({
            query: classQuery,
            values: [classId]
        });

        if (!classData || classData.length === 0) {
            return NextResponse.json({ 
                hasAccess: false, 
                error: 'Class not found' 
            }, { status: 404 });
        }

        const classInfo = classData[0];

        // Admin has access to everything
        if (userLevel === 2) {
            return NextResponse.json({
                hasAccess: true,
                accessReason: 'admin',
                isTeacher: false,
                isAdmin: true,
                classDetails: classInfo
            });
        }

        // Check if user is the teacher
        if (classInfo.teacher_id === userId) {
            return NextResponse.json({
                hasAccess: true,
                accessReason: 'teacher',
                isTeacher: true,
                isAdmin: false,
                classDetails: classInfo
            });
        }

        // Check if user is enrolled as a student
        const enrollmentQuery = `
            SELECT user_id 
            FROM classes_users 
            WHERE class_id = ? AND user_id = ?
        `;

        const enrollmentData = await executeQueryWithRetry({
            query: enrollmentQuery,
            values: [classId, userId]
        });

        const isEnrolled = enrollmentData && enrollmentData.length > 0;

        if (isEnrolled) {
            return NextResponse.json({
                hasAccess: true,
                accessReason: 'enrolled',
                isTeacher: false,
                isAdmin: false,
                classDetails: classInfo
            });
        }

        // No access
        return NextResponse.json({
            hasAccess: false,
            accessReason: 'not_enrolled',
            isTeacher: false,
            isAdmin: false,
            error: 'You don\'t have access to this class'
        }, { status: 403 });

    } catch (error) {
        console.error('Error checking class access:', error);
        return NextResponse.json({ 
            hasAccess: false,
            error: 'Failed to check class access' 
        }, { status: 500 });
    }
}
