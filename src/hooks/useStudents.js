import { useEffect, useState } from 'react';
import { fetchViewData } from '../app/lib/helpers';

export const useStudents = (classId, session, isTeacher) => {
    const [students, setStudents] = useState([]);

    useEffect(() => {
        if (!classId || !session || !isTeacher) return;

        const fetchStudentData = async () => {
            try {
                const [studentsData, classesData] = await Promise.all([
                    fetchViewData('students_view'),
                    fetchViewData('classes_users')
                ]);

                const registeredStudents = classesData
                    .filter(entry => parseInt(entry.class_id) === parseInt(classId))
                    .map(entry => {
                        const student = studentsData.find(s => s.user_id === entry.user_id);
                        return student ? { ...student, ...entry } : null;
                    })
                    .filter(Boolean);

                setStudents(registeredStudents);
            } catch (err) {
                console.error('Error fetching student data:', err);
            }
        };

        fetchStudentData();
    }, [classId, session, isTeacher]);

    return { students };
};
