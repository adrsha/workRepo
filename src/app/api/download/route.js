import { executeQueryWithRetry } from '../../lib/db';

// Content data parsing
const parseContentData = (contentType, rawData) => {
  try {
    return contentType === 'file' ? JSON.parse(rawData) : rawData;
  } catch (e) {
    console.error('Failed to parse content data:', e);
    return { error: 'Invalid content data' };
  }
};

// Content transformers
const transformFileContent = (item, content_data) => ({
  content_id: item.content_id,
  content_type: item.content_type,
  created_at: item.created_at,
  is_public: item.is_public,
  originalName: content_data.originalName || 'Unknown file',
  fileSize: content_data.fileSize || 0,
  fileType: content_data.fileType || 'application/octet-stream',
  fileName: content_data.fileName || '',
  isFile: true,
  url: `/uploads/classes/${item.class_id}/${content_data.fileName}`
});

const transformTextContent = (item, content_data) => {
  const text = typeof content_data === 'string' ? content_data : '';
  const truncatedText = text.length > 100 ? text.substring(0, 100) + '...' : text;
  
  return {
    content_id: item.content_id,
    content_type: item.content_type,
    created_at: item.created_at,
    is_public: item.is_public,
    text: truncatedText || 'No text content',
    isFile: false
  };
};

const transformContentItem = (item) => {
  const content_data = parseContentData(item.content_type, item.content_data);
  
  return item.content_type === 'file'
    ? transformFileContent(item, content_data)
    : transformTextContent(item, content_data);
};

// Database operations
const fetchPublicContent = async () => {
  const query = `
    SELECT c.content_id, c.content_type, c.content_data, c.created_at, c.is_public, cc.class_id
    FROM content c 
    JOIN class_content cc ON cc.content_id = c.content_id
    WHERE is_public = 1
    ORDER BY created_at DESC
  `;
  
  return await executeQueryWithRetry({ query, values: [] });
};

// Response utilities
const createResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

const createSuccessResponse = (content) => {
  return createResponse({
    content,
    count: content.length
  });
};

const createErrorResponse = (message, error) => {
  console.error('Error listing public content:', error);
  return createResponse({
    error: 'Internal Server Error',
    message
  }, 500);
};

// Main handler
export async function POST() {
  try {
    console.log('Fetching all public content');
    
    const results = await fetchPublicContent();
    console.log(`Found ${results.length} public content items`);
    
    const publicContent = results.map(transformContentItem);
    
    return createSuccessResponse(publicContent);
    
  } catch (error) {
    return createErrorResponse(error.message, error);
  }
}
