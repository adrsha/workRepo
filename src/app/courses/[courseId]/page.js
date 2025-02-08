'use client';
import styles from '../../../styles/Subject.module.css';
import { useEffect, useState } from 'react';
import { use } from 'react';
import { fetchData } from '../../lib/helpers.js';
import Loading from '../../components/Loading.js';
import '../../global.css';

export default function CoursePage({ params }) {
    const resolvedParams = use(params);
    const [courseData, setCourseData] = useState([]);
    console.log(resolvedParams.courseId);

    function getCourse(courseId) {
        return (
            courseData.filter((course) => {
                return course.course_id === courseId;
            })[0] || { course_name: 'Loading...', course_details: 'Loading...' }
        );
    }

    useEffect(() => {
        fetchData('courses').then((data) => setCourseData(data));
    }, []);

    return (
        <div className={styles.container}>
            <h2 className={styles.subjectTitle}>
                {getCourse(parseInt(resolvedParams.courseId)).course_name[0].toUpperCase() +
                    getCourse(parseInt(resolvedParams.courseId)).course_name.slice(1)}
            </h2>
            <span className={styles.courseDetails}>{getCourse(parseInt(resolvedParams.courseId)).course_details}</span>
            <div className={styles.subjectContainer}>
                {courseData.length === 0 ? (
                    <Loading />
                ) : (
                    <>
                        <div className={styles.subjectLSideMenu}>
                            <ul>
                                <li className={styles.active}>Chapter 1</li>
                                <li>Chapter 2</li>
                                <li>Chapter 3</li>
                            </ul>
                        </div>
                        <div className={styles.subjectRSideMenu}></div>
                    </>
                )}
            </div>
        </div>
    );
}
