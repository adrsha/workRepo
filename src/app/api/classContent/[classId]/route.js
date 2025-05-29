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
        JOIN class_content ON content.content_id = class_content.content_id
        WHERE class_content.class_id = ?
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
        const { classId, contentType, contentData } = await request.json();

        if (!classId || !contentType || !contentData) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if the user is the teacher of this class
        const teacherQuery = `
      SELECT teacher_id 
      FROM classes 
      WHERE class_id = ?
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

        // Insert content
        const insertContentQuery = `
          INSERT INTO content (content_type, content_data)
          VALUES (?, ?)
        `;

        const contentResult = await executeQueryWithRetry({
            query: insertContentQuery,
            values: [contentType, contentData]
        });

        const newContentId = contentResult.insertId;

        // Link content to class
        const linkContentQuery = `
      INSERT INTO class_content (class_id, content_id)
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

        // Parse markdown for response if it's text content
        const responseContent = newContent[0];
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
    let contentId = classId
    console.log(contentId, params)
    if (!contentId) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    try {
        // First, get the class ID for this content
        const getClassQuery = `
      SELECT cc.class_id, c.teacher_id
      FROM class_content cc
      JOIN classes c ON cc.class_id = c.class_id
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
        if (classData[0].teacher_id !== session.user.id) {
            return NextResponse.json({ error: 'Only the teacher can delete content' }, { status: 403 });
        }

        // Delete the class_content relation first
        const deleteRelationQuery = `
      DELETE FROM class_content
      WHERE content_id = ?
    `;

        await executeQueryWithRetry({
            query: deleteRelationQuery,
            values: [contentId]
        });

        // Then delete the content itself
        const deleteContentQuery = `
      DELETE FROM content
      WHERE content_id = ?
    `;

        await executeQueryWithRetry({
            query: deleteContentQuery,
            values: [contentId]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting content:', error);
        return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
    }
}
