'use client';
import { useRouter } from 'next/navigation';
import styles from '../styles/Home.module.css';
import './global.css';

export default function HomePage() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <main className={styles.mainContent}>
                <div className={styles.leftSection}>
                    <img className={styles.profileCircle + ' slabs'} src="/logo.png" alt="logo" />
                    <div className={styles.menuButtons}>
                        <button onClick={() => router.push('/classes')} id={styles.course}>
                            <span>
                                {' '}
                                <img src="/course.png" alt="course_image" />{' '}
                            </span>
                            Courses
                        </button>
                        <button onClick={() => router.push('/preparation')} id={styles.preparation}>
                            <span>
                                <img src="/preparation.png" alt="preparation_image" />
                            </span>
                            Preparation
                        </button>
                        <button onClick={() => router.push('/languages')} id={styles.languages}>
                            <span>
                                {' '}
                                <img src="/language.png" alt="language_image" />{' '}
                            </span>
                            Language Classes
                        </button>
                        <button onClick={() => router.push('/others')} id={styles.others}>
                            <span>
                                {' '}
                                <img src="/others.png" alt="others_image" />{' '}
                            </span>
                            Others
                        </button>
                    </div>
                </div>
            </main>
            <div className={styles.topDetails}>
                <div className={styles.topCourses + ' slabs'}>
                    <h1>Top Courses</h1>
                    <div className={styles.topCoursesList}>
                        <div className={styles.topCoursesListItem + ' slices'}>
                            <span>class 12</span>
                            <h3>English</h3>
                            <span>from teacher </span>
                        </div>
                        <div className={styles.topCoursesListItem + ' slices'}>
                            <span>class 12</span>
                            <h3>Maths</h3>
                            <span>from teacher </span>
                        </div>
                        <div className={styles.topCoursesListItem + ' slices'}>
                            <span>class 1</span>
                            <h3>Science</h3>
                            <span>from teacher </span>
                        </div>
                    </div>
                </div>
                <div className={styles.topCourses + ' slabs'}>
                    <h1>Top Courses</h1>
                    <div className={styles.topCoursesList}>
                        <div className={styles.topCoursesListItem + ' slices'}>
                            <span>class 12</span>
                            <h3>English</h3>
                            <span>from teacher </span>
                        </div>
                        <div className={styles.topCoursesListItem + ' slices'}>
                            <span>class 12</span>
                            <h3>Maths</h3>
                            <span>from teacher </span>
                        </div>
                        <div className={styles.topCoursesListItem + ' slices'}>
                            <span>class 1</span>
                            <h3>Science</h3>
                            <span>from teacher </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
