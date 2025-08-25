import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';
import ClassDetailsClient from './ClassDetailsClient';
import { fetchData, fetchViewData } from '../../lib/helpers.js';
import styles from '../../../styles/Profile.module.css';

export const metadata = {
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
};

export default async function ClassDetailsPage({ params }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return (
            <div className={styles.profileError}>
                <h2>Authentication Required</h2>
                <p>You must be logged in to view classes.</p>
            </div>
        );
    }

    const asyncParams = await params;
    const classId = asyncParams.class;

    const initialData = {
        classDetails: null,
        teacher: null,
        students: [],
        isClassOwner: false,
        error: null
    };

    if (session?.user) {
        try {
            const userId = session.user.id;
            const authToken = session.accessToken;

            // Fetch class details from classes_view
            const classesViewData = await fetchViewData('classes_view', authToken);
            const classDetails = classesViewData.find(cls => cls.class_id.toString() === classId);
            
            
            if (!classDetails) {
                initialData.error = 'Class not found or you don\'t have access to it.';
                return <ClassDetailsClient initialData={initialData} classId={classId} session={session} />;
            }
            
            const classesUsersData = await fetchData('classes_users', authToken);
            const usersData = await fetchViewData('users_view', authToken);
            const students = classesUsersData.map(cu => cu.class_id.toString() === classId && usersData.find(u => u.user_id === cu.user_id));
            
            initialData.students = students;
            initialData.classDetails = classDetails;
            initialData.isClassOwner = userId === classDetails.teacher_id;

            const teachersViewData = await fetchViewData('teachers_view', authToken);
            const teacher = teachersViewData.find(t => t.user_id === classDetails.teacher_id);
            initialData.teacher = teacher;

            // Fetch students if user is class owner
            if (initialData.isClassOwner) {
                const classUsersData = await fetchData('classes_users', authToken);
                const usersData = await fetchViewData('users_view', authToken);

                const studentIds = classUsersData
                    .filter(cu => cu.class_id.toString() === classId)
                    .map(cu => cu.user_id);

                const students = usersData
                    .filter(user => studentIds.includes(user.user_id) && user.level === 0);

                initialData.students = students;
            }

        } catch (error) {
            console.error('Error pre-fetching class data:', error);
            initialData.error = 'Failed to load class data. Please try again.';
        }
    }

    return <ClassDetailsClient initialData={initialData} classId={classId} session={session} />;
}
