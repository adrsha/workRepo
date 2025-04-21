import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';
import { createReadStream } from 'fs';
import { join } from 'path';

// Define the uploads directory path
const uploadsDir = join(process.cwd(), 'public');

export async function GET(req, { params }) {
  try {
    // Get contentId from route params
    const { contentId } = await params;

    if (!contentId) {
      return new Response(JSON.stringify({ error: 'Missing contentId' }), {
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

    // Fetch the content metadata from database
    const contentRecord = await executeQueryWithRetry({
      query: `
        SELECT 
          c.content_id, 
          c.content_type,
          c.content_data
        FROM content c
        WHERE c.content_id = ?
      `,
      values: [contentId],
    });

    // Check if content exists
    if (!contentRecord || contentRecord.length === 0) {
      return new Response(JSON.stringify({ error: 'Content not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentItem = contentRecord[0];
    const contentData = JSON.parse(contentItem.content_data);
    // Verify this is a file type content
    if (!contentData.isFile) {
      return new Response(JSON.stringify({ error: 'Requested content is not a file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    //
    // if ((contentData.fileType || '').toLowerCase() === 'application/pdf') {
    //   return new Response(JSON.stringify({ error: 'PDFs must be accessed through the secure proxy' }), {
    //     status: 403,
    //     headers: { 'Content-Type': 'application/json' }
    //   });
    // }
    // Check user authorization to access this content
    // Here you would add logic to check if the user has permission to access this content
    // For example, check if user belongs to the class or has admin rights
    const userHasAccess = await checkUserAccess(session.user, contentId);

    if (!userHasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied: User does not have permission to view this file' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract file path from content data
    const filePath = contentData.filePath;
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'File path not found in content data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct the absolute path to the file
    // Remove the leading slash from filePath if it exists
    const cleanFilePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const absoluteFilePath = join(uploadsDir, cleanFilePath);

    try {
      // Read the file from the filesystem
      const stream = createReadStream(absoluteFilePath);

      // Return the file with appropriate headers
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': contentData.fileType || 'application/octet-stream',
          // Force inline display and add the filename
          'Content-Disposition': `inline; filename="${contentData.originalName}"`,
          // Prevent browsers from caching the file
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          // Additional security headers
          'X-Content-Type-Options': 'nosniff',
          // Prevents the PDF from being opened in a new tab in most browsers
          'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'; style-src 'self'; font-src 'self'; img-src 'self';",
          // Add custom header to track access
          'X-Secure-Access': `user=${session.user.id};time=${new Date().toISOString()}`,
          'X-Download-Tracked': 'true',
          'X-Content-Session': session.user.id,
        }
      });
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return new Response(JSON.stringify({ error: 'File not found or cannot be read' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error retrieving secure file:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Function to check if user has access to the content
async function checkUserAccess(user, contentId) {
  if (user.level === 2) return true;
  try {
    // Query to check if the user has access to the content
    // This is a basic implementation - you might need to expand this based on your access control logic
    const result = await executeQueryWithRetry({
      query: `
        SELECT cc.class_id
        FROM class_content cc
        JOIN classes_users cm ON cc.class_id = cm.class_id
        JOIN classes c ON c.class_id = cc.class_id
        WHERE cc.content_id = ? AND (cm.user_id = ? OR c.teacher_id = ?)
      `,
      values: [contentId, user.id, user.id],
    });

    // If there's at least one result, user has access
    return result && result.length > 0;
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}
