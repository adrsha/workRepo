import { executeQueryWithRetry } from '../../lib/db';

// Constants
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// Validation utilities
const validateUserId = (userId, teacherId) => {
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

// Data transformers
const transformTeacherDetails = (teacher) => ({
    user_id: teacher.user_id,
    user_name: teacher.user_name,
    experience: teacher.experience,
    qualification: teacher.qualification,
    video_path: teacher.video_path,
    certificate_path: teacher.certificate_path,
    cv_path: teacher.cv_path,
    classes_count: teacher.classes_count || 0,
    students_count: teacher.students_count || 0,
    courses: teacher.courses ? teacher.courses.split(',').filter(Boolean) : [],
    hasVideo: !!teacher.video_path,
});

// Database operations
const fetchTeacherDetails = async (userId, limit, offset) => {
    const query = `
        SELECT 
            t.user_id, 
            u.user_name, 
            t.experience, 
            t.qualification, 
            t.video_path, 
            t.certificate_path,
            t.cv_path,
            COUNT(DISTINCT c.class_id) as classes_count,
            COUNT(DISTINCT cu.user_id) as students_count,
            GROUP_CONCAT(DISTINCT co.course_name) as courses
        FROM teachers t 
        LEFT JOIN users u ON t.user_id = u.user_id 
        LEFT JOIN classes c ON t.user_id = c.teacher_id
        LEFT JOIN classes_users cu ON c.class_id = cu.class_id
        LEFT JOIN courses co ON c.course_id = co.course_id
        ${userId ? 'WHERE t.user_id = ?' : ''}
        GROUP BY t.user_id, u.user_name, t.experience, t.qualification, t.video_path, t.certificate_path, t.cv_path
        ORDER BY t.user_id 
        LIMIT ? OFFSET ?
    `;
    
    const values = userId ? [userId, limit, offset] : [limit, offset];
    return await executeQueryWithRetry({ query, values });
};

const fetchTeacherDetailsWithVideo = async (userId, limit, offset) => {
    const query = `
        SELECT 
            t.user_id, 
            u.user_name, 
            t.experience, 
            t.qualification, 
            t.video_path, 
            t.certificate_path,
            t.cv_path,
            COUNT(DISTINCT c.class_id) as classes_count,
            COUNT(DISTINCT cu.user_id) as students_count,
            GROUP_CONCAT(DISTINCT co.course_name) as courses
        FROM teachers t 
        LEFT JOIN users u ON t.user_id = u.user_id 
        LEFT JOIN classes c ON t.user_id = c.teacher_id
        LEFT JOIN classes_users cu ON c.class_id = cu.class_id
        LEFT JOIN courses co ON c.course_id = co.course_id
        WHERE t.video_path IS NOT NULL
        ${userId ? 'AND t.user_id = ?' : ''}
        GROUP BY t.user_id, u.user_name, t.experience, t.qualification, t.video_path, t.certificate_path, t.cv_path
        ORDER BY t.user_id 
        LIMIT ? OFFSET ?
    `;
    
    const values = userId ? [userId, limit, offset] : [limit, offset];
    return await executeQueryWithRetry({ query, values });
};

const countTeacherDetails = async (userId, videoOnly = false) => {
    let query = `
        SELECT COUNT(DISTINCT t.user_id) as total 
        FROM teachers t 
        LEFT JOIN users u ON t.user_id = u.user_id
        ${videoOnly ? 'WHERE t.video_path IS NOT NULL' : 'WHERE 1=1'}
    `;
    
    let values = [];
    
    if (userId) {
        query += ' AND t.user_id = ?';
        values.push(userId);
    }
    
    const result = await executeQueryWithRetry({ query, values });
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
    const userId = validateUserId(
        url.searchParams.get('userId'), 
        url.searchParams.get('teacher_id')
    );
    const limit = validateLimit(url.searchParams.get('limit'));
    const offset = validateOffset(url.searchParams.get('offset'));
    const videoOnly = url.searchParams.get('video_only') === 'true';
    
    return { userId, limit, offset, videoOnly };
};

const processPostRequest = async (req) => {
    const body = await req.json();
    
    const userId = validateUserId(body.userId, body.teacher_id);
    const limit = validateLimit(body.limit);
    const offset = validateOffset(body.offset);
    const videoOnly = body.video_only === true;
    
    return { userId, limit, offset, videoOnly };
};

// Main handlers
export async function GET(req) {
    try {
        const url = new URL(req.url);
        const { userId, limit, offset, videoOnly } = await processGetRequest(url);
        
        const [results, total] = await Promise.all([
            videoOnly 
                ? fetchTeacherDetailsWithVideo(userId, limit, offset)
                : fetchTeacherDetails(userId, limit, offset),
            countTeacherDetails(userId, videoOnly)
        ]);
        
        const teachers = results.map(transformTeacherDetails);
        
        // If searching for a specific teacher and no results found, return 404
        if (userId && teachers.length === 0) {
            return createErrorResponse('Teacher not found', 404);
        }
        
        return createSuccessResponse(teachers, total, limit, offset);
        
    } catch (error) {
        const status = error.message.includes('Invalid') ? 400 : 500;
        return createErrorResponse(error.message, status);
    }
}

export async function POST(req) {
    try {
        const { userId, limit, offset, videoOnly } = await processPostRequest(req);
        
        const [results, total] = await Promise.all([
            videoOnly 
                ? fetchTeacherDetailsWithVideo(userId, limit, offset)
                : fetchTeacherDetails(userId, limit, offset),
            countTeacherDetails(userId, videoOnly)
        ]);
        
        const teachers = results.map(transformTeacherDetails);
        
        // If searching for a specific teacher and no results found, return 404
        if (userId && teachers.length === 0) {
            return createErrorResponse('Teacher not found', 404);
        }
        
        return createSuccessResponse(teachers, total, limit, offset);
        
    } catch (error) {
        const status = error.message.includes('Invalid') ? 400 : 500;
        return createErrorResponse(error.message, status);
    }
}
