'use client';
import styles from '../../../styles/Courses.module.css';
import { useEffect, useState } from 'react';
import { use } from 'react';
import { fetchData } from '../../lib/helpers.js';
import Loading from '../../components/Loading.js';
import '../../global.css';

export default function CoursePage({ params }) {
    const resolvedParams = use(params);
    const [courseData, setCourseData] = useState([]);
    const [classData, setClassData] = useState([]);

    function getClassName(classId) {
        return (classData.filter((classDetails) => {
            return classDetails.class_id === classId
        })[0]?.class_name ) || "Loading...";
    }

    function getCoursesForThisClass() {
        let courses = [];
        courseData.forEach((course) => {
            if (course.class_id === parseInt(resolvedParams.class)) {
                courses.push(course);
            }
        });
        return courses;
    }

    useEffect(() => {
        fetchData('courses').then((data) => setCourseData(data));
        fetchData('classes').then((data) => setClassData(data));
    }, []);

    return (
        <div className={styles.container}>
            <h2 className={styles.centeredHeader}>{getClassName(parseInt(resolvedParams.class))}</h2>
            <div className={styles.subjectContainer}>
                {courseData.length > 0 ? (
                    getCoursesForThisClass().length > 0 ? (
                        getCoursesForThisClass().map((course) => {
                            return (
                                <div key={course.course_id} className={styles.subjectCard}>
                                    <div className={styles.subjectIcon}></div>
                                    <h3>{course.course_name[0].toUpperCase() + course.course_name.slice(1)}</h3>
                                </div>
                            );
                        })
                    ) : (
                        <h3 className={styles.subjectCard} style={{ cursor: 'default' }}>
                            No courses found
                        </h3>
                    )
                ) : (
                    <Loading />
                )}
            </div>
        </div>
    );
}
