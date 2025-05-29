const path = require('path');
export const CONFIG = {
    SERVER_UPLOADS_DIR: path.join(process.cwd(), 'public/uploads'),
    USER_LEVELS: { STUDENT: 0, TEACHER: 1, ADMIN: 2 },
    ERRORS: {
        UNAUTHORIZED: 'Unauthorized',
        MISSING_CLASS_ID: 'Missing classId',
        MISSING_CONTENT: 'Missing file or textContent',
        DB_FAILED: 'Database operation failed',
        INTERNAL: 'Internal Server Error'
    },
    CONTENT_TYPES: {
        TEXT: 'text',
        FILE: 'file'
    }
};

export const INITIAL_CONTENT_FORM = {
    contentType: 'text',
    contentData: '',
    isPublic: false
};
