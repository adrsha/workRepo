export async function removeClass(classId) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/removeteachersCourses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ classId: classId }),
        });

        if (!response.ok) {
            throw new Error('Failed to remove class');
        }

        return await response.json();
    } catch (error) {
        console.error('Error removing class:', error);
        throw error;
    }
}

export async function addClass(courseId, startTime, endTime, repeatEveryNDay, classDescription, grade) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/addteachersCourses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                courseId,
                gradeId: grade,
                startTime,
                endTime,
                repeatEveryNDay,
                classDescription,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to add class');
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding class:', error);
        throw error;
    }
}

export async function updateTeacherProfile(teacherId, profileData) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/updateTeacherProfile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                teacherId,
                ...profileData
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update teacher profile');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating teacher profile:', error);
        throw error;
    }
}
