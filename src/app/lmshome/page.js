'use client';
import { useEffect, useState } from 'react';
import styles from '../../styles/Lmshome.module.css';
import Loading from '../components/Loading.js';
import '../global.css';

import {fetchViewData} from '../lib/helpers.js';
import { useSession } from 'next-auth/react';

import {useRouter} from 'next/navigation';

export default function LMSHome() {
    const { data: session, status } = useSession();
    const [classesData, setClassesData] = useState([]);
    const router = useRouter();

    useEffect(() => {
        fetchViewData('course_details_view').then((data) => setClassesData(data));
    }, [session])

    return (
        <div className={styles.container}>
            {status === 'authenticated' ? (
                <>
                    <h1 className={styles.title}>Dashboard</h1>

                    <h2>Enrolled Courses</h2>
                    <div className={styles.courseCards}>
                        {classesData.map((classData) => (
                            <div className={styles.courseCard} key={classData.class_id}>
                                <h2>
                                    {classData.course_name[0].toUpperCase() + classData.course_name.slice(1)}
                                    <span> - {classData.teacher_name}</span>
                                </h2>
                                <span> for {classData.grade_name}</span>
                                <p>{classData.course_details}</p>
                                <span className={styles.courseDetails}>
                                    <button
                                        className={styles.courseDetailsButton}
                                        onClick={() => router.push(`/classes/${classData.class_id}`)}>
                                        Study
                                    </button>
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                status === 'loading' ? <Loading /> : 
                         <>
                            <h3>You must be logged in to see this!</h3>
                            <button onClick={() => router.push('/registration/login')} style={{
                                width: "fit-content",
                                cursor: "pointer",
                            }}>Login</button>
                        </> 
            )}
        </div>
    );
}
