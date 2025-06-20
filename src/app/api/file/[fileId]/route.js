import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../../lib/db';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(req, { params }) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);

    // Check if the session is valid
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    const fileId = params.fileId;

    if (!fileId) {
      return new Response(JSON.stringify({ error: 'Missing file ID' }), { status: 400 });
    }

    // Fetch file info from database
    const contentRecord = await executeQueryWithRetry({
      query: `
        SELECT 
          c.content_id, 
          c.content_type,
          c.content_data
        FROM content c
        WHERE c.content_id = ?
      `,
      values: [fileId],
    });

    if (!contentRecord || contentRecord.length === 0) {
      return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 });
    }

    const contentItem = contentRecord[0];

    // Only proceed if it's a file type
    if (contentItem.content_type !== 'file') {
      return new Response(JSON.stringify({ error: 'Content is not a file' }), { status: 400 });
    }

    const fileData = JSON.parse(contentItem.content_data);

    // Get file path from public directory
    const filePath = join(process.cwd(), 'public', fileData.filePath);

    // Check if file exists
    if (!existsSync(filePath)) {
      return new Response(JSON.stringify({ error: 'File not found on disk' }), { status: 404 });
    }

    // Read the file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const contentType = fileData.fileType || 'application/octet-stream';

    // Return the file with proper headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileData.originalName}"`,
        'Cache-Control': 'max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error retrieving file:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
