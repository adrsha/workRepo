'use client';
import { useSession } from 'next-auth/react';
import '../global.css';
import styles from '../../styles/Lmshome.module.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [courses, setCourses] = useState([]);
    console.log(session);
    useEffect(() => {
        setCourses(session?.user?.courses);
    }, [session]);
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Dashboard</h1>
            {status === 'authenticated' ? <p>Welcome, {session?.user?.name}!</p> : <p>Not Signed In</p>}
            <h2>Enrolled Courses</h2>
            <div className={styles.courseCards}>
                {courses?.map((course) => (
                    <div className={styles.courseCard} key={course.course_id}>
                        <h2>
                            {course.course_name[0].toUpperCase() + course.course_name.slice(1)}
                            <span> - {course.teacher_name}</span>
                        </h2>
                        <span> for {course.class_name}</span>
                        <p>{course.course_details}</p>
                        <span className={styles.courseDetails}>
                            <button className={styles.courseDetailsButton} onClick={() => router.push(`/courses/${course.relation_id}`)}>Study</button>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
