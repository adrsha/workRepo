import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]/authOptions';
import LMSHomeClient from './LMSHomeClient';
import { fetchViewData, fetchJoinableData, fetchData } from '../lib/helpers.js';
import { getMetadata } from '../seoConfig';

export const metadata = getMetadata("lmshome");

export default async function LMSHomePage() {
    const session = await getServerSession(authOptions);
    
    const initialData = {
        classesData: null,
        courseData: [],
        gradeData: [],
        pendingTeachersData: [],
        teacherProfile: null
    };

    if (session?.user) {
        try {
            const userLevel = session.user.level;
            const userId = session.user.id;
            const authToken = session.accessToken;

            if (userLevel === 0) {
                // Student data
                const viewData = await fetchViewData('classes_view', authToken);
                const classUsersData = await fetchData('classes_users', authToken);

                const userClasses = classUsersData
                    .filter(classUser => classUser.user_id === userId)
                    .map(classUser => {
                        return viewData.find(view => view.class_id === classUser.class_id);
                    })
                    .filter(Boolean);
                initialData.classesData = userClasses;

            } else if (userLevel === 1) {
                // Teacher data
                const classesData = await fetchJoinableData(
                    ['classes', 'courses', 'grades'],
                    ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
                    '*',
                    { 'classes.teacher_id': userId },
                    authToken,
                    true,
                );
                initialData.classesData = classesData;

                const coursesData = await fetchData('courses', authToken);
                initialData.courseData = coursesData;

                const gradesData = await fetchData('grades', authToken);
                initialData.gradeData = gradesData;

                const profileData = await fetchViewData('teachers_view', authToken);
                const teacherProfile = profileData.find(teacher => teacher.user_id === userId);
                initialData.teacherProfile = teacherProfile;

            } else if (userLevel === 2) {
                // Admin data
                const pendingData = await fetchData('pending_teachers', authToken);
                initialData.pendingTeachersData = pendingData;
            }
        } catch (error) {
            console.error('Error pre-fetching data:', error);
        }
    }
    return <LMSHomeClient initialData={initialData} />;
}
