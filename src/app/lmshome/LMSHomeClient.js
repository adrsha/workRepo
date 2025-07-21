'use client';
import { useEffect, useState } from 'react';
import styles from '../../styles/Lmshome.module.css';
import Loading from '../components/Loading.js';
import '../global.css';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import AdminDashboard from './AdminDashboard';
import { fetchJoinableData, fetchViewData, fetchData } from '../lib/helpers.js';

export default function LMSHomeClient({ initialData }) {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const [userData, setUserData] = useState({
        classesData: initialData.classesData,
        courseData: initialData.courseData,
        gradeData: initialData.gradeData,
        pendingTeachersData: initialData.pendingTeachersData,
        teacherProfile: initialData.teacherProfile,
    });
    
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!session || initialData.classesData) return;
        
        const fetchUserData = async () => {
            const token = session?.accessToken || localStorage.getItem('authToken');
            setIsLoading(true);
            
            try {
                if (session.user.level === 0) {
                    await initializeStudentData(token);
                } else if (session.user.level === 1) {
                    await initializeTeacherData(token);
                } else if (session.user.level === 2) {
                    await initializeAdminData(token);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [session, initialData.classesData]);

    const initializeStudentData = async (token) => {
        const viewData = await fetchViewData('classes_view');
        const classUsersData = await fetchData('classes_users', token);

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
        setUserData(prev => ({ ...prev, classesData: courseArray }));
    };

    const initializeTeacherData = async (token) => {
        const data = await fetchJoinableData(
            ['classes', 'courses', 'grades'],
            ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
            '*',
            { 'classes.teacher_id': session.user.id }
        );

        const coursesData = await fetchData('courses', token);
        const gradesData = await fetchData('grades', token);

        const response = await fetchViewData('teachers_view', token);
        let profileData = null;
        if (response.ok) {
            profileData = await response.json();
        }

        setUserData(prev => ({
            ...prev,
            classesData: data,
            courseData: coursesData,
            gradeData: gradesData,
            teacherProfile: profileData
        }));
    };

    const initializeAdminData = async (token) => {
        const response = await fetchData('pending_teachers', token);
        setUserData(prev => ({ ...prev, pendingTeachersData: response }));
    };

    const renderContent = () => {
        if (status === 'loading' || isLoading) {
            return <Loading />;
        }

        if (status !== 'authenticated') {
            return renderAuthPrompt();
        }

        return (
            <>
                {renderHeader()}
                {renderUserContent()}
            </>
        );
    };

    const renderAuthPrompt = () => (
        <div className={styles.authPrompt}>
            <h2>Please log in to access your dashboard</h2>
            <button
                className={styles.loginButton}
                onClick={() => router.push('/registration/login')}>
                Login
            </button>
        </div>
    );

    const renderHeader = () => (
        <div className={styles.header}>
            <h1 className={styles.title}>Dashboard</h1>
            {session && (
                <p className={styles.welcome}>
                    {getWelcomeMessage(session.user.level)}
                </p>
            )}
        </div>
    );

    const getWelcomeMessage = (userLevel) => {
        const messages = {
            0: 'Welcome to your enrolled classes!',
            1: 'Welcome to your classes.',
            2: 'Welcome to your control panel.'
        };
        return messages[userLevel] || 'Welcome!';
    };

    const renderUserContent = () => {
        if (!session) return null;
        
        const dashboardProps = {
            userData,
            setUserData,
            session,
            update,
            router,
            setIsLoading,
            isLoading
        };

        switch (session.user.level) {
            case 0:
                return <StudentDashboard {...dashboardProps} />;
            case 1:
                return <TeacherDashboard {...dashboardProps} />;
            case 2:
                return <AdminDashboard {...dashboardProps} />;
            default:
                return null;
        }
    };

    return (
        <div className={styles.container}>
            {renderContent()}
        </div>
    );
}
