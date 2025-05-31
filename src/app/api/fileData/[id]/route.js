import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';

export async function GET(req, { params }) {
  try {
    // Get contentId from route params
    const { id } = await params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing content ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the user session
    const session = await getServerSession(authOptions);

    // Check if the session is valid
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check user authorization to access this content
    const userHasAccess = await checkUserAccess(session.user.id, id);

    if (!userHasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied: User does not have permission to view this file' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch the content metadata from database
    const contentRecord = await executeQueryWithRetry({
      query: `
        SELECT 
          c.content_id, 
          c.content_type,
          c.content_data,
          c.created_at
        FROM content c
        WHERE c.content_id = ?
      `,
      values: [id],
    });

    // Check if content exists
    if (!contentRecord || contentRecord.length === 0) {
      return new Response(JSON.stringify({ error: 'Content not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentItem = contentRecord[0];
    const content_data = JSON.parse(contentItem.content_data);

    // Verify this is a file type content
    if (!content_data.isFile) {
      return new Response(JSON.stringify({ error: 'Requested content is not a file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Format response with file metadata
    const fileMetadata = {
      content_id: contentItem.content_id,
      content_type: contentItem.content_type,
      created_at: contentItem.created_at,
      file_name: content_data.originalName,
      file_size: formatFileSize(content_data.fileSize),
      mime_type: content_data.fileType,
      uploaded_by: content_data.uploadedBy
    };

    return new Response(JSON.stringify(fileMetadata), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error retrieving file data:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Function to check if user has access to the content
async function checkUserAccess(userId, contentId) {
  try {
    // Query to check if the user has access to the content
    const result = await executeQueryWithRetry({
      query: `
        SELECT cc.class_id
        FROM class_content cc
        JOIN classes_users cm ON cc.class_id = cm.class_id
        JOIN classes c ON c.class_id = cc.class_id
        WHERE cc.content_id = ? AND (cm.user_id = ? OR c.teacher_id = ?)
      `,
      values: [contentId, userId, userId],
    });

    // If there's at least one result, user has access
    return result && result.length > 0;
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}
