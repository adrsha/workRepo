const publicDataTables = ['grades', 'classes', 'courses', 'classes_users', 'notices'];

export async function fetchData(tableName, authToken = null) {
    try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name');
        }

        // Create a proper absolute URL that works in both browser and server environments
        const baseUrl = typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const url = new URL(`/api/general`, baseUrl);
        url.searchParams.append('table', tableName);
        const response = await fetch(url.toString(), {
            headers: {
                ...(publicDataTables.includes(tableName)
                    ? {}
                    : {
                        Authorization: `Bearer ${authToken}`,
                    }),
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const answer = await response.json()

        return answer;
    } catch (error) {
        console.error('Error in fetchData:', error);
        throw new Error(error.message);
    }
}

export async function fetchViewData(viewName, token) {
    try {
        // Create headers object with the authorization token
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add authorization header if token is provided
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Create a proper absolute URL that works in both browser and server environments
        const baseUrl = typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const url = new URL(`/api/views`, baseUrl);
        url.searchParams.append('view', viewName);

        // Make the fetch request with headers
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error('Failed to fetch View data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in fetchViewData:', error);
        throw new Error(error.message);
    }
}

export async function getUserData(userId, authToken = null) {
    try {
        const response = await fetch(`/api/general?table=users`, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const users = await response.json();
        return users.find((user) => user.user_id === userId);
    } catch (error) {
        console.error('Error in getUserData:', error);
        throw new Error(error.message);
    }
}

export async function fetchDataWhereAttrIs(tableName, conditions, authToken = null) {
    try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name');
        }

        let queryString = `?table=${tableName}`;
        for (const [attr, value] of Object.entries(conditions)) {
            queryString += `&${encodeURIComponent(attr)}=${encodeURIComponent(value)}`;
        }
        console.log("QUERY", queryString);

        const response = await fetch(`/api/selective${queryString}`, {
            headers: {
                ...(publicDataTables.includes(tableName)
                    ? {}
                    : {
                        Authorization: `Bearer ${authToken}`,
                    }),
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch filtered data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error in fetchDataWhereAttrIs:', error);
        throw new Error(error.message);
    }
}

export async function fetchJoinableData(tables, joinConditions, selectionAttrs = '*', additionalFilters = {}, authToken = null) {
    try {
        // Validate input
        if (!Array.isArray(tables) || tables.length < 2) {
            throw new Error('At least two tables are required for a join');
        }

        if (!Array.isArray(joinConditions) || joinConditions.length !== tables.length - 1) {
            throw new Error('Mismatch between tables and join conditions');
        }

        // Construct the query string
        const searchParams = new URLSearchParams();
        tables.forEach(table => searchParams.append('table', table));
        joinConditions.forEach(condition => searchParams.append('join', condition));
        searchParams.append('selectionAttrs', selectionAttrs);

        // Add additional filters to the query string
        for (const [key, value] of Object.entries(additionalFilters)) {
            searchParams.append(key, value);
        }

        // Fetch data from the joinable API table=classes_users&classes_users.user_id=3
        const response = await fetch(`/api/joinable/?${searchParams.toString()}`, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch joinable data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in fetchJoinableData:', error);
        throw new Error(error.message);
    }
}

// New function to check if user is enrolled in a class
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

// New function to get user's enrolled classes
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

// New function to get class details with enrollment check
export async function getClassDetailsWithEnrollmentCheck(classId, userId, authToken = null) {
    try {
        // First check if user is enrolled or is the teacher
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
        throw new Error(error.message);
    }
}

// New function to get secure class list for teacher profile
export async function getSecureTeacherClasses(teacherId, viewerId, authToken = null) {
    try {
        // Get all classes for the teacher
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
        throw new Error(error.message);
    }
}

export async function updateTableData(tableName, data, conditions, authToken = null) {
    try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name');
        }

        const response = await fetch('/api/updateProfile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(publicDataTables.includes(tableName)
                    ? {}
                    : {
                        Authorization: `Bearer ${authToken}`,
                    }),
            },
            body: JSON.stringify({ data, conditions })
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

export function getDate(string) {
    let date = new Date(string)
    let yyyymmdd = (date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate())
    let hhmmss = (date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds())
    return { yyyymmdd, hhmmss }
}
