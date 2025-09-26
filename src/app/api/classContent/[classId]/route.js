import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { marked } from 'marked';
import { NextResponse } from 'next/server';

export async function checkClassAccess(classId, userId, userLevel) {
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
            return { 
                hasAccess: false, 
                error: 'Class not found' 
            };
        }

        const classInfo = classData[0];

        // Admin has access to everything
        if (userLevel === 2) {
            return {
                hasAccess: true,
                accessReason: 'admin',
                isTeacher: false,
                isAdmin: true,
                classDetails: classInfo
            };
        }

        // Check if user is the teacher
        if (classInfo.teacher_id === userId) {
            return {
                hasAccess: true,
                accessReason: 'teacher',
                isTeacher: true,
                isAdmin: false,
                classDetails: classInfo
            };
        }

        // Check if user is enrolled as a student
        const enrollmentQuery = `
            SELECT user_id 
            FROM classes_users 
            WHERE class_id = ? AND user_id = ?
        `;
        console.log(classId, userId)
        const enrollmentData = await executeQueryWithRetry({
            query: enrollmentQuery,
            values: [classId, userId]
        });
        console.log(enrollmentData)

        const isEnrolled = enrollmentData && enrollmentData.length > 0;
 
        if (isEnrolled) {
            return {
                hasAccess: true,
                accessReason: 'enrolled',
                isTeacher: false,
                isAdmin: false,
                classDetails: classInfo
            };
        }

        // No access
        return {
            hasAccess: false,
            accessReason: 'not_enrolled',
            isTeacher: false,
            isAdmin: false,
            error: 'You don\'t have access to this class'
        };

    } catch (error) {
        console.error('Error checking class access:', error);
        return { 
            hasAccess: false,
            error: 'Failed to check class access' 
        };
    }
}
export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await params;

    if (!classId) {
        return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    try {
        // Check if user has access to this class using helper function
        const accessCheck = await checkClassAccess(classId, session.user.id, session.user.level);
 
        if (!accessCheck.hasAccess) {
            return NextResponse.json({ 
                error: accessCheck.error || 'You don\'t have access to this class content' 
            }, { status: 403 });
        }

        // Get content based on user permissions
        let contentQuery;
        let queryValues;

        if (accessCheck.isTeacher || accessCheck.isAdmin) {
            // Teachers and admins see all content
            contentQuery = `
                SELECT content.*
                FROM content
                JOIN classes_content ON content.content_id = classes_content.content_id
                WHERE classes_content.classes_id = ?
                ORDER BY content.created_at DESC
            `;
            queryValues = [classId];
        } else {
            // Students only see public content
            contentQuery = `
                SELECT content.*
                FROM content
                JOIN classes_content ON content.content_id = classes_content.content_id
                WHERE classes_content.classes_id = ? AND content.is_public = 1
                ORDER BY content.created_at DESC
            `;
            queryValues = [classId];
        }

        const contents = await executeQueryWithRetry({
            query: contentQuery,
            values: queryValues,
        });
        return NextResponse.json(contents);
    } catch (error) {
        console.error('Error fetching class content:', error);
        return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { classId, contentType, content_data } = await request.json();

        if (!classId || !contentType || !content_data) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if user has permission to add content using helper function
        const accessCheck = await checkClassAccess(classId, session.accessToken);
        
        if (!accessCheck.hasAccess) {
            return NextResponse.json({ 
                error: accessCheck.error || 'Class not found' 
            }, { status: 404 });
        }

        if (!accessCheck.isTeacher && !accessCheck.isAdmin) {
            return NextResponse.json({ 
                error: 'Only teachers and admins can add content' 
            }, { status: 403 });
        }

        // Insert content and link to class
        const insertContentQuery = `
            INSERT INTO content (content_type, content_data)
            VALUES (?, ?)
        `;

        const contentResult = await executeQueryWithRetry({
            query: insertContentQuery,
            values: [contentType, content_data]
        });

        const newContentId = contentResult.insertId;

        // Link content to class
        const linkContentQuery = `
            INSERT INTO classes_content (classes_id, content_id)
            VALUES (?, ?)
        `;

        await executeQueryWithRetry({
            query: linkContentQuery,
            values: [classId, newContentId]
        });

        // Get the newly created content
        const getContentQuery = `
            SELECT *
            FROM content
            WHERE content_id = ?
        `;

        const newContent = await executeQueryWithRetry({
            query: getContentQuery,
            values: [newContentId]
        });

        const responseContent = newContent[0];

        // Parse markdown for response if it's text content
        if (responseContent.content_type === 'text') {
            responseContent.content_data = marked.parse(responseContent.content_data);
        }

        return NextResponse.json(responseContent);
    } catch (error) {
        console.error('Error adding class content:', error);
        return NextResponse.json({ error: 'Failed to add content' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await params;
    const contentId = classId; // This should be contentId based on your usage

    if (!contentId) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    try {
        // Get the class info and verify user permissions  
        const getClassQuery = `
            SELECT cc.classes_id
            FROM classes_content cc
            WHERE cc.content_id = ?
        `;

        const classData = await executeQueryWithRetry({
            query: getClassQuery,
            values: [contentId]
        });

        if (!classData || classData.length === 0) {
            return NextResponse.json({ error: 'Content not found' }, { status: 404 });
        }

        const classId = classData[0].classes_id;
        const accessCheck = await checkClassAccess(classId, session.user.id, session.user.level);

        if (!accessCheck.hasAccess) {
            return NextResponse.json({ 
                error: 'You don\'t have access to this class' 
            }, { status: 403 });
        }

        // Only teachers and admins can delete content
        if (!accessCheck.isTeacher && session.user.level !== 2) {
            return NextResponse.json({ 
                error: 'Only teachers and admins can delete content' 
            }, { status: 403 });
        }

        // Delete the content
        const deleteContentQuery = `
            DELETE FROM content
            WHERE content_id = ?
        `;

        const result = await executeQueryWithRetry({
            query: deleteContentQuery,
            values: [contentId]
        });

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Content not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Content deleted successfully',
            affectedRows: result.affectedRows
        });

    } catch (error) {
        console.error('Error deleting content:', error);
        return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
    }
}
