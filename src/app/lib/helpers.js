function getBaseUrl() {
    return typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

function createHeaders(authToken = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (authToken ) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
}

export async function fetchData(tableName, authToken = null) {
    try {
        const baseUrl = getBaseUrl();
        
        const url = new URL(`/api/general`, baseUrl);
        url.searchParams.append('table', tableName);
        
        const response = await fetch(url.toString(), {
            headers: createHeaders(authToken)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in fetchData:', error);
        throw error;
    }
}

export async function fetchViewData(viewName, authToken = null) {
    try {
        const baseUrl = getBaseUrl();
        const url = new URL(`/api/views`, baseUrl);
        url.searchParams.append('view', viewName);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch view data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in fetchViewData:', error);
        throw error;
    }
}

export async function getUserData(userId, authToken = null) {
    try {
        const users = await fetchData('users', authToken);
        return users.find((user) => user.id === userId); // Changed from user_id to id
    } catch (error) {
        console.error('Error in getUserData:', error);
        throw error;
    }
}

// Fetch data with conditions - use main API endpoint
export async function fetchDataWhereAttrIs(tableName, conditions, authToken = null) {
    try {
        const baseUrl = getBaseUrl();
        const url = new URL(`/api/general`, baseUrl);
        url.searchParams.append('table', tableName);
        
        // Add conditions as query parameters
        for (const [attr, value] of Object.entries(conditions)) {
            url.searchParams.append(attr, value);
        }

        const response = await fetch(url.toString(), {
            headers: createHeaders(authToken)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch filtered data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in fetchDataWhereAttrIs:', error);
        throw error;
    }
}

// Simplified joinable data fetching
export async function fetchJoinableData(tables, joinConditions, selectionAttrs = '*', additionalFilters = {}, authToken = null, isServerSide = false) {
    try {
        // Validate input
        if (!Array.isArray(tables) || tables.length < 2) {
            throw new Error('At least two tables are required for a join');
        }

        if (!Array.isArray(joinConditions) || joinConditions.length !== tables.length - 1) {
            throw new Error('Mismatch between tables and join conditions');
        }

        const searchParams = new URLSearchParams();
        tables.forEach(table => searchParams.append('table', table));
        joinConditions.forEach(condition => searchParams.append('join', condition));
        searchParams.append('selectionAttrs', selectionAttrs);

        // Add additional filters
        for (const [key, value] of Object.entries(additionalFilters)) {
            searchParams.append(key, value);
        }
        const response = await fetch(`${isServerSide ? getBaseUrl() : ""}/api/joinable/?${searchParams.toString()}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch joinable data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in fetchJoinableData:', error);
        throw error;
    }
}

// Check if user is enrolled in a class
export async function checkUserEnrollment(userId, classId, authToken = null) {
    try {
        const enrollmentData = await fetchDataWhereAttrIs(
            'classes_users',
            { user_id: userId, class_id: classId },
            authToken
        );
        
        return enrollmentData && enrollmentData.length > 0;
    } catch (error) {
        console.error('Error checking user enrollment:', error);
        return false;
    }
}

// Get user's enrolled classes
export async function getUserEnrolledClasses(userId, authToken = null) {
    try {
        const enrollmentData = await fetchDataWhereAttrIs(
            'classes_users',
            { user_id: userId },
            authToken
        );
        
        return enrollmentData?.map(enrollment => enrollment.class_id) || [];
    } catch (error) {
        console.error('Error fetching user enrolled classes:', error);
        return [];
    }
}

// Get class details with enrollment check
export async function getClassDetailsWithEnrollmentCheck(classId, userId, authToken = null) {
    try {
        const classData = await fetchDataWhereAttrIs('classes', { class_id: classId }, authToken);
        if (!classData || classData.length === 0) {
            throw new Error('Class not found');
        }

        const classInfo = classData[0];
        
        // Check if user is the teacher
        if (classInfo.teacher_id === userId) {
            return { ...classInfo, hasAccess: true, accessReason: 'teacher' };
        }

        // Check if user is enrolled
        const isEnrolled = await checkUserEnrollment(userId, classId, authToken);
        
        if (isEnrolled) {
            return { ...classInfo, hasAccess: true, accessReason: 'enrolled' };
        }

        // Return limited information for non-enrolled users
        return {
            class_id: classInfo.class_id,
            course_name: classInfo.course_name,
            class_description: classInfo.class_description,
            cost: classInfo.cost,
            teacher_id: classInfo.teacher_id,
            hasAccess: false,
            accessReason: 'not_enrolled'
        };
    } catch (error) {
        console.error('Error fetching class details with enrollment check:', error);
        throw error;
    }
}

// Get secure class list for teacher profile
export async function getSecureTeacherClasses(teacherId, viewerId, authToken = null) {
    try {
        const classesData = await fetchJoinableData(
            ['classes', 'courses', 'grades'],
            ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
            '*',
            { 'classes.teacher_id': teacherId },
            authToken
        );

        if (!classesData || classesData.length === 0) {
            return [];
        }

        // Get viewer's enrolled classes if they're not the teacher
        let viewerEnrolledClasses = [];
        if (viewerId !== teacherId) {
            viewerEnrolledClasses = await getUserEnrolledClasses(viewerId, authToken);
        }

        // Filter and secure the class data based on viewer's access
        const secureClasses = classesData.map(classItem => {
            const isTeacher = viewerId === teacherId;
            const isEnrolled = viewerEnrolledClasses.includes(classItem.class_id);
            const hasAccess = isTeacher || isEnrolled;

            if (hasAccess) {
                return {
                    ...classItem,
                    hasAccess: true,
                    accessReason: isTeacher ? 'teacher' : 'enrolled'
                };
            } else {
                // Return limited information for non-enrolled viewers
                return {
                    class_id: classItem.class_id,
                    course_name: classItem.course_name,
                    grade_name: classItem.grade_name,
                    class_description: classItem.class_description,
                    cost: classItem.cost,
                    teacher_id: classItem.teacher_id,
                    hasAccess: false,
                    accessReason: 'not_enrolled'
                };
            }
        });

        return secureClasses;
    } catch (error) {
        console.error('Error fetching secure teacher classes:', error);
        throw error;
    }
}

// Update table data - simplified
export async function updateTableData(tableName, data, conditions, authToken = null) {
    try {
        const response = await fetch(`${getBaseUrl()}/api/updateProfile`, {
            method: 'POST',
            headers: createHeaders(authToken),
            body: JSON.stringify({ 
                tableName, // Include table name in body
                data, 
                conditions 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in updateTableData:', error);
        throw error;
    }
}


/**
 * Get user access level from session
 * @param {Object} session - NextAuth session object
 * @returns {number|null} User level (0: student, 1: teacher, 2: admin)
 */
export const getUserLevel = (session) => {
    return session?.user?.level ?? null;
};

/**
 * Group classes by course for better organization
 * @param {Array} classes - Array of class objects with course information
 * @returns {Array} Grouped classes by course
 */
export const groupClassesByCourse = (classes) => {
    if (!classes || !classes.length) return [];

    const sortedClasses = [...classes].sort((a, b) =>
        a.course_name.localeCompare(b.course_name)
    );

    const grouped = [];
    let courseIndex = 0;
    let prevCourseName = '';

    sortedClasses.forEach(classData => {
        const { course_name, course_details, ...classDetails } = classData;

        if (course_name === prevCourseName) {
            grouped[grouped.length - 1].classes.push(classDetails);
        } else {
            grouped.push({
                course_id: courseIndex++,
                course_name,
                course_description: course_details,
                classes: [classDetails]
            });
        }

        prevCourseName = course_name;
    });

    return grouped;
};

/**
 * Check user's class status (joined, pending, owned, available)
 * @param {number} classId - Class ID to check
 * @param {number} userLevel - User's access level
 * @param {Array} joinedClasses - Array of class IDs user has joined
 * @param {Array} pendingClasses - Array of class IDs pending approval
 * @param {Array} ownedClasses - Array of class IDs user owns (for teachers)
 * @returns {string} Status: 'owned', 'joined', 'pending', or 'available'
 */
export const getClassStatus = (classId, userLevel, joinedClasses = [], pendingClasses = [], ownedClasses = []) => {
    if ((userLevel === 1 || userLevel === 2) && ownedClasses.includes(classId)) {
        return 'owned';
    }

    if ((userLevel === 0 || userLevel === 2) && joinedClasses.includes(classId)) {
        return 'joined';
    }

    if ((userLevel === 0 || userLevel === 2) && pendingClasses.includes(classId)) {
        return 'pending';
    }

    return 'available';
};


/**
 * Add unique items to an array without duplicates
 * @param {Array} existingArray - Current array
 * @param {Array} newItems - New items to add
 * @param {string} uniqueKey - Key to check for uniqueness
 * @returns {Array} Combined array without duplicates
 */
export const addUniqueItems = (existingArray, newItems, uniqueKey) => {
    const filtered = newItems.filter(
        newItem => !existingArray.some(existing => existing[uniqueKey] === newItem[uniqueKey])
    );
    return [...existingArray, ...filtered];
};


// API-related helper functions

/**
 * Fetch user's joined classes
 * @param {string} userId - User ID
 * @param {string} authToken - Authentication token
 * @returns {Promise<Array>} Array of joined class IDs
 */
export const fetchUserJoinedClasses = async (userId, authToken) => {
    try {
        const data = await fetchDataWhereAttrIs('classes_users', { 'user_id': userId }, authToken);
        return data.map(item => item.class_id);
    } catch (error) {
        console.error('Error fetching joined classes:', error);
        throw error;
    }
};

/**
 * Fetch user's pending classes
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of pending class IDs
 */
export const fetchUserPendingClasses = async (userId) => {
    try {
        const pendingData = await fetchViewData('pending_classes_view');
        const userPendingClasses = pendingData.filter(item => item.user_id === userId);
        return userPendingClasses.map(item => item.class_id);
    } catch (error) {
        console.error('Error fetching pending classes:', error);
        throw error;
    }
};

/**
 * Fetch teacher's owned classes
 * @param {string} userId - User ID (teacher)
 * @param {string} authToken - Authentication token
 * @returns {Promise<Array>} Array of owned class IDs
 */
export const fetchTeacherOwnedClasses = async (userId, authToken) => {
    try {
        const data = await fetchDataWhereAttrIs('classes', { 'teacher_id': userId }, authToken);
        return data.map(item => item.class_id);
    } catch (error) {
        console.error('Error fetching owned classes:', error);
        throw error;
    }
};

/**
 * Fetch classes for a specific grade
 * @param {number} gradeId - Grade ID
 * @param {string} authToken - Authentication token (optional)
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @returns {Promise<Array>} Array of class objects
 */
export const fetchClassesForGrade = async (gradeId, authToken = null, isAuthenticated = false) => {
    try {
        return await fetchJoinableData(
            ['grades', 'classes', 'courses'],
            ['grades.grade_id = classes.grade_id', 'classes.course_id = courses.course_id'],
            '*',
            { 'grades.grade_id': gradeId },
            isAuthenticated ? authToken : null,
            false
        );
    } catch (error) {
        console.error('Error fetching classes for grade:', error);
        throw error;
    }
};

// Validation helpers

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalizeFirst = (str) => {
    if (!str) return '';
    return str[0].toUpperCase() + str.slice(1);
};
