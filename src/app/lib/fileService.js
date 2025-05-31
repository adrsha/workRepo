/**
 * File Service for handling file operations with both local and server storage
 */
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { executeQueryWithRetry } from './db';

// Define paths for both local and server storage
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const SERVER_UPLOADS_DIR = process.env.SERVER_UPLOADS_DIR || '/home/merotuit/root/public/uploads';
const USE_SERVER_FILES = process.env.USE_SERVER_FILES === 'true' || false;

/**
 * Retrieves file metadata from the database
 * @param {string} id - File ID (content_id)
 * @returns {Promise<Object>} File metadata
 */
export async function getFileData(id) {
  try {
    // Query the content table to get file data
    const contentResults = await executeQueryWithRetry({
      query: `
        SELECT content_id, content_type, content_data, created_at
        FROM content
        WHERE content_id = ?
      `,
      values: [id]
    });

    if (!contentResults || contentResults.length === 0) {
      throw new Error('File not found');
    }

    const contentRecord = contentResults[0];

    // Parse the JSON data from content_data
    let fileData = contentRecord;
    if (typeof contentRecord.content_data === 'string') {
      try {
        const parsedData = JSON.parse(contentRecord.content_data);
        // Combine the database record with the parsed JSON data
        fileData = {
          ...contentRecord,
          ...parsedData
        };
      } catch (err) {
        console.warn('Invalid JSON in content_data:', contentRecord.content_data);
      }
    }

    // Make sure we have a mime_type property for compatibility with the PDF proxy
    if (!fileData.mime_type && fileData.fileType) {
      fileData.mime_type = fileData.fileType;
    }

    return fileData;
  } catch (error) {
    console.error('Error getting file data:', error);
    throw error;
  }
}

/**
 * Creates a readable stream for the file
 * @param {string} id - File ID (content_id)
 * @returns {Promise<Readable>} Readable stream of the file
 */
export async function getFileStream(id) {
  try {
    const fileData = await getFileData(id);

    // First, try to use server path if available and configured
    if (USE_SERVER_FILES && fileData.serverPath && fs.existsSync(fileData.serverPath)) {
      return fs.createReadStream(fileData.serverPath);
    }

    // Extract the file path from the content data
    let filePath;

    if (fileData.filePath) {
      // Convert URL path to filesystem path for local storage
      // Example: /uploads/classes/123/file.pdf -> ./public/uploads/classes/123/file.pdf
      const relativePath = fileData.filePath.replace(/^\/uploads/, '');
      filePath = path.join(LOCAL_UPLOADS_DIR, relativePath);
    } else if (fileData.fileName) {
      // If we have classId information, use the class directory structure
      const classId = await getContentClassId(id);
      if (classId) {
        filePath = path.join(LOCAL_UPLOADS_DIR, 'classes', classId, fileData.fileName);
      } else {
        filePath = path.join(LOCAL_UPLOADS_DIR, fileData.fileName);
      }
    } else {
      throw new Error('File path information not found');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found on disk: ${filePath}`);
    }

    // Create and return a readable stream
    return fs.createReadStream(filePath);
  } catch (error) {
    console.error('Error getting file stream:', error);
    throw error;
  }
}

/**
 * Get the class ID associated with a content ID
 * @param {string} contentId - Content ID
 * @returns {Promise<string|null>} Class ID or null if not found
 */
async function getContentClassId(contentId) {
  try {
    const results = await executeQueryWithRetry({
      query: `
        SELECT class_id
        FROM class_content
        WHERE content_id = ?
        LIMIT 1
      `,
      values: [contentId]
    });

    if (results && results.length > 0) {
      return results[0].class_id;
    }

    return null;
  } catch (error) {
    console.error('Error getting class ID for content:', error);
    return null;
  }
}

/**
 * Save file to both local and server storage
 * 
 * @param {Buffer|Readable} fileBuffer - File data as buffer or stream
 * @param {string} originalName - Original file name
 * @param {string} fileType - MIME type of the file
 * @param {string} userId - ID of the user uploading the file
 * @param {string} classId - ID of the class the file belongs to
 * @returns {Promise<Object>} Saved file metadata
 */
export async function saveFile(fileBuffer, originalName, fileType, userId, classId) {
  try {
    // Generate unique filename using your existing pattern
    const timestamp = Date.now();
    const fileExtension = originalName.split('.').pop();
    const fileName = `${userId}_${timestamp}.${fileExtension}`;

    // Create local directory structure
    const localClassUploadsDir = path.join(LOCAL_UPLOADS_DIR, 'classes', classId);
    try {
      if (!fs.existsSync(localClassUploadsDir)) {
        fs.mkdirSync(localClassUploadsDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create local directory:', error);
    }

    // Create server directory structure
    const serverClassUploadsDir = path.join(SERVER_UPLOADS_DIR, 'classes', classId);
    try {
      if (!fs.existsSync(serverClassUploadsDir)) {
        fs.mkdirSync(serverClassUploadsDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create server directory:', error);
    }

    // Prepare buffers for both local and server storage
    let dataBuffer;
    if (fileBuffer instanceof Readable) {
      // Convert stream to buffer for dual storage
      const chunks = [];
      for await (const chunk of fileBuffer) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      dataBuffer = Buffer.concat(chunks);
    } else {
      // Already a buffer
      dataBuffer = fileBuffer;
    }

    // Save file to local disk
    const localFilePath = path.join(localClassUploadsDir, fileName);
    await fs.promises.writeFile(localFilePath, dataBuffer);

    // Save file to server disk
    const serverFilePath = path.join(serverClassUploadsDir, fileName);
    try {
      await fs.promises.writeFile(serverFilePath, dataBuffer);
    } catch (error) {
      console.error('Failed to write to server path:', error);
      // Continue even if server write fails
    }

    // Public URL path for file access
    const publicPath = `/uploads/classes/${classId}/${fileName}`;

    // Prepare file metadata with both paths
    const content_data = JSON.stringify({
      originalName,
      fileName,
      filePath: publicPath,
      fileSize: dataBuffer.length,
      fileType,
      uploadedBy: userId,
      isFile: true,
      serverPath: serverFilePath.replace(/\\/g, '/') // Store server path with forward slashes
    });

    // Save to database
    const contentResult = await executeQueryWithRetry({
      query: `
        INSERT INTO content 
        (content_type, content_data)
        VALUES (?, ?)
      `,
      values: ['file', content_data],
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
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

/**
 * Delete file from both local and server storage
 * @param {string} id - Content ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFile(id) {
  try {
    // Get file data to determine the file path
    const fileData = await getFileData(id);

    // Delete from server if server path exists
    if (fileData.serverPath && fs.existsSync(fileData.serverPath)) {
      try {
        await fs.promises.unlink(fileData.serverPath);
      } catch (error) {
        console.error('Error deleting file from server:', error);
      }
    }

    // Find the class ID to determine the local file location
    const classId = await getContentClassId(id);

    // Determine the local file path
    let localFilePath;
    if (fileData.filePath) {
      // Convert URL path to filesystem path
      const relativePath = fileData.filePath.replace(/^\/uploads/, '');
      localFilePath = path.join(LOCAL_UPLOADS_DIR, relativePath);
    } else if (fileData.fileName && classId) {
      localFilePath = path.join(LOCAL_UPLOADS_DIR, 'classes', classId, fileData.fileName);
    } else if (fileData.fileName) {
      localFilePath = path.join(LOCAL_UPLOADS_DIR, fileData.fileName);
    }

    // Delete from local storage
    if (localFilePath && fs.existsSync(localFilePath)) {
      await fs.promises.unlink(localFilePath);
    }

    // Delete the class_content relation from database
    await executeQueryWithRetry({
      query: `DELETE FROM class_content WHERE content_id = ?`,
      values: [id]
    });

    // Delete the content record from database
    await executeQueryWithRetry({
      query: `DELETE FROM content WHERE content_id = ?`,
      values: [id]
    });

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}
