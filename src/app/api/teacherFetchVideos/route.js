import { executeQueryWithRetry } from '../../lib/db';

// Constants
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// Validation utilities
const validateUserId = (userId, teacherId) => {
    // Check both userId and teacher_id parameters
    const id = userId || teacherId;
    if (!id) return null;
    
    const parsed = parseInt(id, 10);
    if (isNaN(parsed) || parsed <= 0) {
        throw new Error('Invalid userId/teacher_id: must be a positive integer');
    }
    return parsed;
};

const validateLimit = (limit) => {
    if (!limit) return DEFAULT_LIMIT;
    
    const parsed = parseInt(limit, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed > MAX_LIMIT) {
        throw new Error(`Invalid limit: must be between 1 and ${MAX_LIMIT}`);
    }
    return parsed;
};

const validateOffset = (offset) => {
    if (!offset) return 0;
    
    const parsed = parseInt(offset, 10);
    if (isNaN(parsed) || parsed < 0) {
        throw new Error('Invalid offset: must be a non-negative integer');
    }
    return parsed;
};

const validateIncludeAll = (includeAll) => {
    return includeAll === 'true' || includeAll === true;
};

// Data transformers
const transformTeacherVideo = (teacher) => ({
    user_id: teacher.user_id,
    user_name: teacher.user_name,
    experience: teacher.experience,
    qualification: teacher.qualification,
    video_path: teacher.video_path,
    certificate_path: teacher.certificate_path,
    hasVideo: !!teacher.video_path,
});

// Database operations
const fetchTeacherVideos = async (userId, limit, offset) => {
    const baseQuery = `
        SELECT t.user_id, u.user_name, t.experience, t.qualification, 
               t.video_path, t.certificate_path
        FROM teachers t 
        JOIN users u ON t.user_id = u.user_id 
        WHERE t.video_path IS NOT NULL
    `;
    
    let query = baseQuery;
    let values = [];
    
    if (userId) {
        query += ' AND u.user_id = ?';
        values.push(userId);
    }
    
    query += ' ORDER BY u.user_id LIMIT ? OFFSET ?';
    values.push(limit, offset);
    
    return await executeQueryWithRetry({ query, values });
};

const fetchAllTeachers = async (limit, offset) => {
    const query = `
        SELECT t.user_id, u.user_name, t.experience, t.qualification, 
               t.video_path, t.certificate_path
        FROM teachers t
        LEFT JOIN users u ON t.user_id = u.user_id
        ORDER BY t.user_id 
        LIMIT ? OFFSET ?
    `;
    const values = [limit, offset];
    
    return await executeQueryWithRetry({ query, values });
};

const countTeacherVideos = async (userId) => {
    let query = 'SELECT COUNT(*) as total FROM teachers t JOIN users u ON t.user_id = u.user_id WHERE t.video_path IS NOT NULL';
    let values = [];
    
    if (userId) {
        query += ' AND u.user_id = ?';
        values.push(userId);
    }
    
    const result = await executeQueryWithRetry({ query, values });
    return result[0]?.total || 0;
};

const countAllTeachers = async () => {
    const query = 'SELECT COUNT(*) as total FROM teachers';
    const result = await executeQueryWithRetry({ query, values: [] });
    return result[0]?.total || 0;
};

// Response utilities
const createResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
};

const createSingleTeacherResponse = (teacher) => {
    return createResponse({ teacher });
};

const createSuccessResponse = (teachers, total, limit, offset) => {
    return createResponse({
        teachers,
        pagination: {
            count: teachers.length,
            total,
            limit,
            offset,
            hasMore: offset + teachers.length < total
        }
    });
};

const createErrorResponse = (message, status = 500) => {
    console.error('API Error:', message);
    
    const clientMessage = status === 400 ? message : 'Internal Server Error';
    
    return createResponse({
        error: true,
        message: clientMessage
    }, status);
};

// Request processing
const processGetRequest = async (url) => {
    // Support both userId and teacher_id parameters
    const userId = validateUserId(
        url.searchParams.get('userId'), 
        url.searchParams.get('teacher_id')
    );
    const limit = validateLimit(url.searchParams.get('limit'));
    const offset = validateOffset(url.searchParams.get('offset'));
    
    return { userId, limit, offset };
};

const processPostRequest = async (req) => {
    const body = await req.json();
    
    // Support both userId and teacher_id in request body
    const userId = validateUserId(body.userId, body.teacher_id);
    const limit = validateLimit(body.limit);
    const offset = validateOffset(body.offset);
    
    return { userId, limit, offset };
};

const fetchTeacherData = async (includeAll, userId, limit, offset) => {
    const [results, total] = await Promise.all([
        includeAll 
            ? fetchAllTeachers(limit, offset)
            : fetchTeacherVideos(userId, limit, offset),
        includeAll 
            ? countAllTeachers()
            : countTeacherVideos(userId)
    ]);
    
    return { results, total };
};

// Main handlers
export async function GET(req) {
    try {
        const url = new URL(req.url);
        const { userId, limit, offset } = await processGetRequest(url);
        
        const [results, total] = await Promise.all([
            fetchTeacherVideos(userId, limit, offset),
            countTeacherVideos(userId)
        ]);
        
        const teachers = results.map(transformTeacherVideo);
        
        // If searching for a specific teacher and no results found, return 404
        if (userId && teachers.length === 0) {
            return createErrorResponse('Teacher not found or has no video', 404);
        }
        
        return createSuccessResponse(teachers, total, limit, offset);
        
    } catch (error) {
        const status = error.message.includes('Invalid') ? 400 : 500;
        return createErrorResponse(error.message, status);
    }
}

export async function POST(req) {
    try {
        const { userId, limit, offset } = await processPostRequest(req);
        
        const [results, total] = await Promise.all([
            fetchTeacherVideos(userId, limit, offset),
            countTeacherVideos(userId)
        ]);
        
        const teachers = results.map(transformTeacherVideo);
        
        // If searching for a specific teacher and no results found, return 404
        if (userId && teachers.length === 0) {
            return createErrorResponse('Teacher not found or has no video', 404);
        }
        
        return createSuccessResponse(teachers, total, limit, offset);
        
    } catch (error) {
        const status = error.message.includes('Invalid') ? 400 : 500;
        return createErrorResponse(error.message, status);
    }
}
