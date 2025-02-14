'use client';
import { useEffect, useState } from 'react';
import styles from '../../styles/Grades.module.css';
import Loading from '../components/Loading.js';
import '../global.css';
import { fetchData, fetchViewData, fetchJoinableData, fetchDataWhereAttrIs } from '../lib/helpers.js';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function gradesPage() {
    const router = useRouter();

    const [gradesData, setgradesData] = useState([]);
    const [activegrade, setActivegrade] = useState(null);
    const [classesData, setClassesData] = useState([]);
    const [teachersData, setTeachersData] = useState([]);
    const [groupedClassesData, setGroupedClassesData] = useState([]);
    const [classesUsersJoined, setClassesUsersJoined] = useState([]);
    const [isJoining, setIsJoining] = useState(false);

    const { data: session, status, update } = useSession();

    function getTeacher(teacherId) {
        return teachersData?.find((teacher) => teacher.user_id === teacherId);
    }

    async function checkStatusJoined() {
        if (!session || status !== 'authenticated') {
            console.log('Session not ready yet');
            return;
        }
        const authToken = localStorage.getItem('authToken');
        const userId = session.user.id;
        fetchDataWhereAttrIs('classes_users', { 'classes_users.user_id': userId }, authToken).then((data) =>
            setClassesUsersJoined(data.map((user) => user.class_id))
        );
    }

    async function joinClass(classId) {
        setIsJoining(true);

        if (!session) {
            console.error('User not authenticated');
            return;
        }
        const response = await fetch('/api/joinClass', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({
                classId,
                userId: session.user.id,
            }),
        });

        update();
        if (!response.ok) {
            console.error('Failed to join class', await response.json());
        } else {
            console.log(' User has successfully joined class');
        }
        setIsJoining(false);
    }

    useEffect(() => {
        setActivegrade(gradesData[0]?.grade_id);
    }, [gradesData]);

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        if (!gradesData.length) {
            fetchData('grades', authToken).then((data) => setgradesData(data));
        }
        fetchViewData('teachers').then((data) => setTeachersData(data));
    }, []);
    useEffect(() => {
        console.log("Active grade", activegrade, status);
        if (activegrade) {
            const authToken = localStorage.getItem('authToken');
            fetchJoinableData(
                ['grades', 'classes', 'courses'],
                ['grades.grade_id = classes.grade_id', 'classes.course_id = courses.course_id'],
                '*',
                { 'grades.grade_id': activegrade },
                (status === 'authenticated') ? authToken : null
            ).then((data) => {
                setClassesData(data);
            });
            checkStatusJoined();
        }
    }, [activegrade, session, status]);

    useEffect(() => {
        setGroupedClassesData([]);
        console.log(classesData);
        if (!classesData.length) return;
        let sortedClasses = classesData.sort((a, b) => a.course_name.localeCompare(b.course_name));
        let prevCourseName = '';
        let groupedClassesData = [];
        let i = 0;
        sortedClasses.forEach((classData) => {
            let { course_name: _, course_details: __, ...shreadedClass } = classData;
            if (classData.course_name === prevCourseName) {
                groupedClassesData[groupedClassesData.length - 1].classes.push(shreadedClass);
            } else {
                groupedClassesData.push({
                    course_name: classData.course_name,
                    course_id: i,
                    course_description: classData.course_details,
                    classes: [shreadedClass],
                });
                i++;
            }
            prevCourseName = classData.course_name;
        });
        setGroupedClassesData(groupedClassesData);
    }, [classesData]);

    return (
        <div className={styles.container}>
            <div className={styles.sidePanel}>
                <h1 className={styles.header}>Select Classes</h1>
                <div className={styles.gradeCards}>
                    {gradesData.length > 0 ? (
                        gradesData.map((gradeDetails) => {
                            return (
                                <div
                                    className={`${styles.gradeCard} ${activegrade === gradeDetails.grade_id ? styles.activegrade : ''}`}
                                    key={gradeDetails.grade_id}
                                    onClick={() => {
                                        setActivegrade(gradeDetails.grade_id); // Update active grade
                                    }}>
                                    <h2>
                                        {gradeDetails.grade_name[0].toUpperCase() + gradeDetails.grade_name.slice(1)}
                                    </h2>
                                </div>
                            );
                        })
                    ) : (
                        <Loading />
                    )}
                </div>
            </div>
            <main className={styles.mainSection}>
                {groupedClassesData.length > 0 ? (
                    groupedClassesData.map((clDt) => (
                        <div className={styles.classCards} key={clDt.course_id}>
                            <h3>{clDt.course_name}</h3>
                            <span>{clDt.course_description}</span>
                            <ul>
                                {clDt.classes.map((cd) => (
                                    <li key={cd.class_id}>
                                        <a>{cd.teacher_name}</a>
                                        <span className={styles.teacher}>{getTeacher(cd.teacher_id)?.user_name}</span>
                                        <span className={styles.time}>
                                            {cd.start_time} to {cd.end_time}
                                        </span>
                                        <span
                                            className={
                                                styles.joinIn +
                                                (classesUsersJoined.includes(cd.class_id)
                                                    ? ' ' + styles.disabledJoinButton
                                                    : '')
                                            }
                                            onClick={() => {
                                                status === 'authenticated' && !isJoining
                                                    ? classesUsersJoined.includes(cd.class_id)
                                                        ? null
                                                        : joinClass(cd.class_id)
                                                    : router.push('/registration/login');
                                            }}>
                                            {isJoining
                                                ? 'Please wait...'
                                                : classesUsersJoined.includes(cd.class_id)
                                                  ? 'Joined'
                                                  : status === 'authenticated'
                                                    ? 'Join Class'
                                                    : 'Login to Join Class'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))
                ) : (
                    <Loading />
                )}
            </main>
        </div>
    );
}
