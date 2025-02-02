'use client';
import styles from '../../../styles/Courses.module.css';
import { useEffect, useState } from 'react';
import { use } from 'react';
import { fetchData } from '../../lib/helpers.js';
import Loading from '../../components/Loading.js';
import '../../global.css';

export default function CoursePage({ params }) {
    const resolvedParams = use(params);
    const [classCourseData, setClassCourseData] = useState([]);
    const [courseData, setCourseData] = useState([]);
    const [classData, setClassData] = useState([]);

    function getClassName(classId) {
        let className = 'Class';
        classData.forEach((classDetails) => {
            if (classDetails.class_id == parseInt(classId)) {
                className = classDetails.class_name;
            }
        });
        return className;
    }

    function getCoursesForThisClass() {
        let classCourses = classCourseData.filter(
            (classDetails) => classDetails.class_id == parseInt(resolvedParams.class)
        );
        let courses = [];
        if (classCourses.length > 0) {
            courseData.forEach((course) => {
                classCourses.forEach((classCourse) => {
                    if (course.course_id === classCourse.course_id) {
                        courses.push(course);
                    }
                });
            });
        }
        return courses;
    }

    useEffect(() => {
        fetchData('classes_courses_relational').then((data) => setClassCourseData(data));
        fetchData('courses').then((data) => setCourseData(data));
        fetchData('classes').then((data) => setClassData(data));
    }, []);

    return (
        <div className={styles.container}>
            <h2 className={styles.centeredHeader}>{getClassName(resolvedParams.class)}</h2>
            <div className={styles.subjectContainer}>
                {classCourseData.length > 0 && courseData.length > 0 ? (
                    (getCoursesForThisClass().length > 0) ? getCoursesForThisClass().map((course) => {
                        return (
                            <div key={course.course_id} className={styles.subjectCard}>
                                <div className={styles.subjectIcon}></div>
                                <h3>{course.course_name[0].toUpperCase() + course.course_name.slice(1)}</h3>
                            </div>
                        );
                    }): <h3 className={styles.subjectCard} style={{cursor: 'default'}}>No courses found</h3>
                ) : (
                    <Loading />
                )}
            </div>
        </div>
    );
}
