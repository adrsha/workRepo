'use client';
import { useRouter } from 'next/navigation';
import styles from '../styles/Home.module.css';
import './global.css';

export default function HomePage() {
    const router = useRouter();

    return (
        <>
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
                        <div className={styles.topCourses}>
                            <h1 className="headers">Top Teachers</h1>
                            <div className={styles.topCoursesList}>
                                <div className={styles.topCoursesListItem + ' slices hoverable'}>
                                    <span className={styles.smallClassName}>class 12</span>
                                    <h3>Nabin Sharma</h3>
                                    <button className={styles.viewProfile}> View Profile </button>
                                </div>
                                <div className={styles.topCoursesListItem + ' slices hoverable'}>
                                    <span className={styles.smallClassName}>class 12</span>
                                    <h3>Shanti Sharma</h3>
                                    <button className={styles.viewProfile}> View Profile </button>
                                </div>
                                <div className={styles.topCoursesListItem + ' slices hoverable'}>
                                    <span className={styles.smallClassName}>class 1</span>
                                    <h3>Kavi Paudel</h3>
                                    <button className={styles.viewProfile}> View Profile </button>
                                </div>
                            </div>
                        </div>
                        <div className={styles.topCourses}>
                            <h1 className="headers">Top Courses</h1>
                            <div className={styles.topCoursesList}>
                                <div className={styles.topCoursesListItem + ' slices hoverable'}>
                                    <span className={styles.smallClassName}>class 12</span>
                                    <h3>English</h3>
                                    <button className={styles.viewProfile}> View Profile </button>
                                </div>
                                <div className={styles.topCoursesListItem + ' slices hoverable'}>
                                    <span className={styles.smallClassName}>class 12</span>
                                    <h3>Maths</h3>
                                    <button className={styles.viewProfile}> View Profile </button>
                                </div>
                                <div className={styles.topCoursesListItem + ' slices hoverable'}>
                                    <span className={styles.smallClassName}>class 1</span>
                                    <h3>Science</h3>
                                    <button className={styles.viewProfile}> View Profile </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        </>
    );
}
