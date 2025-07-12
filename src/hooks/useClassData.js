import { useEffect, useState } from 'react';
import { fetchJoinableData, fetchViewData } from '../app/lib/helpers';

export const useClassData = (classId, session) => {
    const [classDetails, setClassDetails] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!classId) return;

        const fetchClassData = async () => {
            try {
                setLoading(true);
                setError(null);

                const classData = await fetchJoinableData(
                    ['classes', 'courses', 'grades'],
                    ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
                    '*',
                    { 'classes.class_id': classId },
                    session?.accessToken
                );

                if (classData?.length > 0) {
                    setClassDetails(classData[0]);
                    await fetchTeacherData(classData[0].teacher_id);
                } else {
                    setError('Class not found');
                }
            } catch (err) {
                console.error('Error fetching class data:', err);
                setError('Failed to load class information. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        const fetchTeacherData = async (teacherId) => {
            try {
                const teacherData = await fetchViewData('teachers_view');
                const matchedTeacher = teacherData?.find(t => t.user_id === teacherId);
                console.log("MM", teacherId, teacherData);
                if (matchedTeacher) setTeacher(matchedTeacher);
            } catch (err) {
                console.error('Error fetching teacher data:', err);
            }
        };

        fetchClassData();
    }, [classId, session?.accessToken]);

    return { classDetails, setClassDetails, teacher, loading, error };
};
