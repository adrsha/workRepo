import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { marked } from 'marked';
import { NextResponse } from 'next/server';

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
        const contents = await executeQueryWithRetry({
            query: `
                SELECT content.*
                FROM content
                JOIN classes_content ON content.content_id = classes_content.content_id
                WHERE classes_content.classes_id = ?
                ORDER BY content.created_at DESC
            `,
            values: [classId],
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

        // Check if the user is the teacher of this class
        const teacherQuery = `
            SELECT teacher_id
            FROM classes
            WHERE classes_id = ?
        `;

        const classData = await executeQueryWithRetry({
            query: teacherQuery,
            values: [classId]
        });

        if (!classData || classData.length === 0) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        if (classData[0].teacher_id !== session.user.id) {
            return NextResponse.json({ error: 'Only the teacher can add content' }, { status: 403 });
        }

        // Insert content and link to class in a single transaction
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
    let contentId = classId; // Note: This seems like it should be contentId from params

    if (!contentId) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    try {
        // Get the class info to verify teacher permissions
        const getClassQuery = `
            SELECT cc.classes_id, c.teacher_id
            FROM classes_content cc
            JOIN classes c ON cc.classes_id = c.class_id
            WHERE cc.content_id = ?
        `;

        const classData = await executeQueryWithRetry({
            query: getClassQuery,
            values: [contentId]
        });

        if (!classData || classData.length === 0) {
            return NextResponse.json({ error: 'Content not found' }, { status: 404 });
        }
        
        // Check if user is the teacher of this class
        // if (classData[0].teacher_id !== session.user.id) {
        if(!session.user.level>=1){
            return NextResponse.json({ error: 'Only the teacher or admin can delete content' }, { status: 403 });
        }

        // Simply delete the content - cascading rules handle the rest
        // The trigger will:
        // 1. Log files for cleanup
        // 2. Delete from class_content junction table
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
