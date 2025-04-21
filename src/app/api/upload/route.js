import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import fs from 'fs';

// Define the local uploads directory path
const localUploadsDir = join(process.cwd(), 'public', 'uploads');

// Define the server uploads directory path - update this to your server path
const serverUploadsDir = process.env.SERVER_UPLOADS_DIR || '/home/merotuit/root/public/uploads';

export async function POST(req) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);

    // Check if the session is valid
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated' }), { status: 401 });
    }

    // Extract the user ID from the session
    const userId = session.user.id;

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file');
    const classId = formData.get('classId');
    const textContent = formData.get('textContent'); // For text content uploads

    // Validate input
    if (!classId) {
      return new Response(JSON.stringify({ error: 'Missing classId' }), { status: 400 });
    }

    // Handle different content types
    if (file && file instanceof File) {
      // File upload handling
      return await handleFileUpload(file, classId, userId);
    } else if (textContent) {
      // Text content handling
      return await handleTextContent(textContent, classId, userId);
    } else {
      return new Response(JSON.stringify({ error: 'Missing file or textContent' }), { status: 400 });
    }
  } catch (error) {
    console.error('Error processing upload:', error);

    // More specific error handling
    if (error.message === 'Database operation failed') {
      return new Response(JSON.stringify({ error: 'Database error occurred' }), { status: 503 });
    }

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

// Handler for file uploads
async function handleFileUpload(file, classId, userId) {
  // Generate unique filename
  const timestamp = Date.now();
  const originalName = file.name;
  const fileExtension = originalName.split('.').pop();
  const fileName = `${userId}_${timestamp}.${fileExtension}`;

  // Create local directory structure: uploads/classes/[classId]
  const localClassUploadsDir = join(localUploadsDir, 'classes', classId);
  try {
    await mkdir(localClassUploadsDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create local directory:', error);
  }

  // Create server directory structure: uploads/classes/[classId]
  const serverClassUploadsDir = join(serverUploadsDir, 'classes', classId);
  try {
    // Using fs.mkdirSync for server directories to ensure they exist
    if (!fs.existsSync(serverClassUploadsDir)) {
      fs.mkdirSync(serverClassUploadsDir, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to create server directory:', error);
  }

  // Convert file to buffer
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Save file to local disk
  const localFilePath = join(localClassUploadsDir, fileName);
  await writeFile(localFilePath, fileBuffer);

  // Save file to server disk
  const serverFilePath = join(serverClassUploadsDir, fileName);
  try {
    fs.writeFileSync(serverFilePath, fileBuffer);
  } catch (error) {
    console.error('Failed to write file to server:', error);
    // Continue even if server write fails, as we have the local copy
  }

  // The public path for URL access
  const publicPath = `/uploads/classes/${classId}/${fileName}`;

  // Save file metadata to database
  const result = await saveFileMetadata({
    userId,
    classId,
    originalName,
    fileName,
    filePath: publicPath,
    fileSize: file.size,
    fileType: file.type,
  });

  return new Response(JSON.stringify(result), { status: 200 });
}

// Handler for text content
async function handleTextContent(textContent, classId, userId) {
  try {
    // Save text content to database
    const result = await saveTextContent({
      userId,
      classId,
      textContent
    });

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error('Error saving text content:', error);
    throw error;
  }
}

async function saveFileMetadata({ userId, classId, originalName, fileName, filePath, fileSize, fileType }) {
  try {
    // First, insert into the content table
    const contentData = JSON.stringify({
      originalName,
      fileName,
      filePath,
      fileSize,
      fileType,
      uploadedBy: userId,
      isFile: true, // Flag to indicate this is a file
      serverPath: join(serverUploadsDir, 'classes', classId, fileName).replace(/\\/g, '/') // Add server path for fileService
    });

    const contentResult = await executeQueryWithRetry({
      query: `
        INSERT INTO content 
        (content_type, content_data)
        VALUES (?, ?)
      `,
      values: ['file', contentData],
    });

    const contentId = contentResult.insertId;

    // Then, create relation in class_content table
    await executeQueryWithRetry({
      query: `
        INSERT INTO class_content 
        (class_id, content_id)
        VALUES (?, ?)
      `,
      values: [classId, contentId],
    });

    // Fetch the inserted content with additional information
    const contentRecord = await executeQueryWithRetry({
      query: `
        SELECT 
          c.content_id, 
          c.content_type,
          c.content_data,
          c.created_at
        FROM content c
        JOIN class_content cc ON c.content_id = cc.content_id
        WHERE c.content_id = ? AND cc.class_id = ?
      `,
      values: [contentId, classId],
    });

    // Parse the JSON data from content_data
    const contentItem = contentRecord[0];
    const parsedData = JSON.parse(contentItem.content_data);

    // Return a combined object with data from both the database and the parsed JSON
    return {
      content_id: contentItem.content_id,
      content_type: contentItem.content_type,
      created_at: contentItem.created_at,
      ...parsedData
    };
  } catch (err) {
    console.error('Database operation failed:', err);
    throw new Error('Database operation failed');
  }
}

// Function to save text content
async function saveTextContent({ userId, classId, textContent }) {
  try {
    // Insert into the content table
    const contentData = JSON.stringify({
      text: textContent,
      uploadedBy: userId,
      isFile: false // Flag to indicate this is not a file
    });

    const contentResult = await executeQueryWithRetry({
      query: `
        INSERT INTO content 
        (content_type, content_data)
        VALUES (?, ?)
      `,
      values: ['text', contentData],
    });

    const contentId = contentResult.insertId;

    // Create relation in class_content table
    await executeQueryWithRetry({
      query: `
        INSERT INTO class_content 
        (class_id, content_id)
        VALUES (?, ?)
      `,
      values: [classId, contentId],
    });

    // Fetch the inserted content
    const contentRecord = await executeQueryWithRetry({
      query: `
        SELECT 
          c.content_id, 
          c.content_type,
          c.content_data,
          c.created_at
        FROM content c
        JOIN class_content cc ON c.content_id = cc.content_id
        WHERE c.content_id = ? AND cc.class_id = ?
      `,
      values: [contentId, classId],
    });

    // Parse the JSON data
    const contentItem = contentRecord[0];
    const parsedData = JSON.parse(contentItem.content_data);

    // Return combined object
    return {
      content_id: contentItem.content_id,
      content_type: contentItem.content_type,
      created_at: contentItem.created_at,
      ...parsedData
    };
  } catch (err) {
    console.error('Database operation failed:', err);
    throw new Error('Database operation failed');
  }
}
