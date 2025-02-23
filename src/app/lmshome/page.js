'use client';
import { useEffect, useState } from 'react';
import styles from '../../styles/Lmshome.module.css';
import Loading from '../components/Loading.js';
import Input from '../components/Input.js';

import '../global.css';

import { fetchJoinableData, fetchViewData, fetchData } from '../lib/helpers.js';
import { useSession } from 'next-auth/react';

import { useRouter } from 'next/navigation';

async function removeClass(classId) {
    const response = await fetch('/api/removeteachersCourses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
            classId: classId,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to remove class');
    }

    return await response.json();
}
async function addClass(courseId = null, startTime = null, endTime = null, classDescription = null, grade = null) {
    const response = await fetch('/api/addteachersCourses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
            courseId: courseId,
            gradeId: grade,
            startTime: startTime,
            endTime: endTime,
            classDescription: classDescription,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to add class');
    }

    return await response.json();
}

async function actionTeacher(pendingId, approved = true) {
    const response = await fetch('/api/pendingTeachers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
            pendingId: pendingId,
            approved: approved,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to approve teacher');
    }

    return await response.json();
}

export default function LMSHome() {
    const { data: session, status, update } = useSession();
    const [classesData, setClassesData] = useState([]);
    const router = useRouter();
    const userLevel = session?.user.level;
    const [addClassOverLayState, setAddClassOverlayState] = useState(false);
    const [addClassError, setAddClassError] = useState('');
    const [courseData, setCourseData] = useState([]);
    const [gradeData, setGradeData] = useState([]);
    const [pendingTeachersData, setPendingTeachersData] = useState([]);
    const [showClassDeleters, setShowClassDeleters] = useState(false);
    useEffect(() => {
        if (!session) return;
        if (userLevel === 0) {
            fetchViewData('course_details_view').then((data) => {
                let courseArray = [];
                for (let i = 0; i < data.length; i++) {
                    if (data[i].user_id === session.user.id) {
                        courseArray.push(data[i]);
                    }
                }
                setClassesData(courseArray);
            });
        } else if (userLevel === 1) {
            fetchJoinableData(
                ['classes', 'courses', 'grades'],
                ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
                '*',
                { 'classes.teacher_id': session.user.id }
            ).then((data) => {
                setClassesData(data);
            });
            fetchData('courses', localStorage.getItem('authToken')).then((data) => {
                setCourseData(data);
            });
            fetchData('grades', localStorage.getItem('authToken')).then((data) => {
                setGradeData(data);
            });
        } else if (userLevel === 2) {
            fetch('api/pendingTeachers', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
                },
            })
                .then((res) => res.json())
                .then((data) => {
                    console.log(data);
                    setPendingTeachersData(data);
                });
        }
    }, [session]);

    return (
        <div className={styles.container}>
            {status === 'authenticated' ? (
                <>
                    <h1 className={styles.title}>Home</h1>
                    {session ? (
                        <>
                            <p>
                                {session.user.level === 0
                                    ? 'Welcome to Enrolled courses!'
                                    : session.user.level === 1
                                      ? 'Welcome to your classes.'
                                      : 'Welcome to your dashboard.'}
                            </p>
                        </>
                    ) : (
                        <>
                            <h2>Welcome to LMS</h2>
                            <button
                                onClick={() => router.push('/registration/login')}
                                style={{
                                    width: 'fit-content',
                                    cursor: 'pointer',
                                }}>
                                Login
                            </button>
                        </>
                    )}
                    {userLevel === 0 ? (
                        classesData.length > 0 ? (
                            <div>
                                {classesData.map((classData) => (
                                    <div className={styles.classCard} key={classData.class_id}>
                                        <h2>
                                            {classData.course_name[0].toUpperCase() + classData.course_name.slice(1)}
                                            <span> - {classData.teacher_name}</span>
                                        </h2>
                                        <span> for {classData.grade_name}</span>
                                        <p>{classData.course_details}</p>
                                        <span className={styles.classDetails}>
                                            <button
                                                className={styles.classDetailsButton}
                                                onClick={() => router.push(`/classes/${classData.class_id}`)}>
                                                Study
                                            </button>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : null
                    ) : userLevel === 1 ? (
                        <>
                            {classesData.length > 0 ? (
                                <div>
                                    {classesData.map((classData) => (
                                        <div className={styles.classCard + ' slabs'} key={classData.class_id}>
                                            <h2>
                                                {classData.course_name[0].toUpperCase() +
                                                    classData.course_name.slice(1)}
                                                <span className={styles.time}>
                                                    {' '}
                                                    {classData.start_time} to {classData.end_time}
                                                </span>
                                            </h2>
                                            <span> for {classData.grade_name}</span>
                                            <p>{classData.class_description}</p>
                                            <span className={styles.classDetails}>
                                                <button
                                                    className={styles.classDetailsButton + ' slices'}
                                                    onClick={() => router.push(`/classes/${classData.class_id}`)}>
                                                    Join Class
                                                </button>
                                            </span>
                                            {showClassDeleters && (
                                                <div className={styles.classDeleter}>
                                                    <button
                                                        className={styles.classDeleterButton}
                                                        onClick={() => {
                                                            removeClass(classData.class_id);
                                                            update();
                                                        }}>
                                                        X
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            <span className={styles.flexyspan}>
                                <button
                                    className={styles.addClass + ' slabs'}
                                    onClick={() => {
                                        setAddClassOverlayState(true);
                                    }}>
                                    Add Class
                                </button>
                                <button
                                    className={styles.deleteClassBtnToggle + ' slabs'}
                                    onClick={() => setShowClassDeleters(!showClassDeleters)}>
                                    {showClassDeleters ? 'Return' : 'Delete Class'}
                                </button>
                            </span>
                        </>
                    ) : userLevel === 2 ? (
                        <>
                            {pendingTeachersData.map((teacher) => (
                                <div className={styles.classCard + ' slabs'} key={teacher.pending_id}>
                                    <h2>
                                        {teacher.user_name}
                                        <span className={styles.time}> {teacher.expires_at}</span>
                                    </h2>
                                    <span> Qualification: {teacher.qualification}</span>
                                    <p>Experience: {teacher.experience}</p>
                                    <span className={styles.classDetails}>
                                        <button
                                            className={styles.approveTeacherBtn + ' slices'}
                                            onClick={() => actionTeacher(teacher.pending_id, true)}>
                                            Approve
                                        </button>
                                        <button
                                            className={styles.denyTeacherBtn + ' slices'}
                                            onClick={() => actionTeacher(teacher.pending_id, false)}>
                                            Deny
                                        </button>
                                    </span>
                                </div>
                            ))}
                        </>
                    ) : null}
                </>
            ) : status === 'loading' ? (
                <Loading />
            ) : (
                <>
                    <h3>You must be logged in to see this!</h3>
                    <button
                        onClick={() => router.push('/registration/login')}
                        style={{
                            width: 'fit-content',
                            cursor: 'pointer',
                        }}>
                        Login
                    </button>
                </>
            )}
            {addClassOverLayState && (
                <div className={styles.addClassOverlay}>
                    <div className={styles.addClassOverlayContent + ' slabs'}>
                        <h1>Add Class</h1>
                        <form
                            className={styles.addClassOverlayForm}
                            onSubmit={(e) => {
                                setAddClassError('');
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const startTime = formData.get('startTime');
                                const endTime = formData.get('endTime');
                                const classDescription = formData.get('classDescription');
                                const grade = parseInt(formData.get('grade'));
                                const courseId = parseInt(formData.get('course'));
                                if (
                                    startTime === '' ||
                                    endTime === '' ||
                                    classDescription === '' ||
                                    courseId === 0 ||
                                    grade === 0
                                ) {
                                    setAddClassError('Please fill in all required fields');
                                } else {
                                    setAddClassError('Successfully added class');
                                    addClass(courseId, startTime, endTime, classDescription, grade, 'add');
                                    update();
                                }
                            }}>
                            <Input
                                label="Course"
                                type="select"
                                name="course"
                                id="course"
                                required
                                data={courseData.map((course) => ({ id: course.course_id, name: course.course_name }))}
                            />
                            <Input
                                label="Grade"
                                type="select"
                                name="grade"
                                id="grade"
                                required
                                data={gradeData.map((grade) => ({ id: grade.grade_id, name: grade.grade_name }))}
                            />
                            <Input label="Start Time" type="time" name="startTime" id="startTime" required />
                            <Input label="End Time" type="time" name="endTime" id="endTime" required />
                            <Input
                                label="Class Description"
                                type="textarea"
                                name="classDescription"
                                id="classDescription"
                                required
                            />
                            {addClassError && <p className={styles.errorDisplay}>{addClassError}</p>}
                            <button type="submit" className={styles.addClassOverlaySubmitButton}>
                                Add Class
                            </button>
                        </form>
                        <button
                            onClick={() => {
                                setAddClassOverlayState(false);
                            }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
