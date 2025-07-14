import { getServerSession } from 'next-auth/next';
import authOptions from '../api/auth/[...nextauth]/authOptions';
import LMSHomeClient from './LMSHomeClient';
import { fetchViewData, fetchJoinableData, fetchData } from '../lib/helpers.js';
import { getMetadata } from '../seoConfig';

export const metadata = getMetadata("lmshome");

export default async function LMSHomePage() {
    const session = await getServerSession(authOptions);
    
    let initialData = {
        classesData: null,
        courseData: [],
        gradeData: [],
        pendingTeachersData: [],
        teacherProfile: null
    };

    if (session?.user) {
        try {
            if (session.user.level === 0) {
                const viewData = await fetchViewData('classes_view');
                const classUsersData = await fetchData('classes_users');

                const courseArray = [];
                for (let i = 0; i < classUsersData.length; i++) {
                    if (classUsersData[i].user_id === session.user.id) {
                        for (let j = 0; j < viewData.length; j++) {
                            if (viewData[j].class_id === classUsersData[i].class_id) {
                                courseArray.push(viewData[j]);
                            }
                        }
                    }
                }
                initialData.classesData = courseArray;
            } else if (session.user.level === 1) {
                // Teacher data
                const classesData = await fetchJoinableData(
                    ['classes', 'courses', 'grades'],
                    ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
                    '*',
                    { 'classes.teacher_id': session.user.id }
                );
                initialData.classesData = classesData;

                const coursesData = await fetchData('courses');
                initialData.courseData = coursesData;

                const gradesData = await fetchData('grades');
                initialData.gradeData = gradesData;

                // Teacher profile data
                const profileData = await fetchViewData('teachers_view');
                initialData.teacherProfile = profileData;
            } else if (session.user.level === 2) {
                // Admin data
                const pendingData = await fetchData('pending_teachers');
                initialData.pendingTeachersData = pendingData;
            }
        } catch (error) {
            console.error('Error pre-fetching data:', error);
        }
    }

    return <LMSHomeClient initialData={initialData} />;
}
