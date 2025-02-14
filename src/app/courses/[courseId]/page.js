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
    const [moduleData, setModuleData] = useState([]);
    const [subModuleData, setSubModuleData] = useState([]);

    function getCourse(courseId) {
        return (
            courseData.filter((course) => {
                return course.course_id === courseId;
            })[0] || { course_name: 'Loading...', course_details: 'Loading...' }
        );
    }

    useEffect(() => {
        fetchData('courses').then((data) => setCourseData(data));
        fetchData('course_modules').then((data) => setModuleData(data));
        fetchData('course_submodules').then((data) => setSubModuleData(data));
        fetchData('course_content').then((data) => setcontentData(data));
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
                                {moduleData
                                    .filter((module) => module.course_id === parseInt(resolvedParams.courseId)) // Filter matching modules
                                    .map((module, index) => (
                                        <li key={module.module_id} className={index === 0 ? styles.active : null}>
                                            <a
                                                className={styles.subjectLink}
                                                href={`/courses/${resolvedParams.courseId}/modules/${module.module_id}`}>
                                                {module.module_name}
                                            </a>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                        <div className={styles.subjectRSideMenu}>
                            {subModuleData
                                // .filter((smodule) => smodule.module_id === parseInt(resolvedParams.courseId)) // Filter matching modules
                                .map((smodule, index) => (
                                    <li key={smodule.module_id} className={index === 0 ? styles.active : null}>
                                        <a
                                            className={styles.subjectLink}
                                            href={`/courses/${resolvedParams.courseId}/modules/${smodule.module_id}`}>
                                            {smodule.submodule_title}
                                        </a>
                                    </li>
                                ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
