'use client';
import { useEffect, useState } from 'react';
import styles from '../../styles/Lmshome.module.css';
import Loading from '../components/Loading.js';
import Input from '../components/Input.js';
import AdminControl from '../components/AdminControl.js';

import '../global.css';

import { fetchJoinableData, fetchViewData, fetchData, getDate } from '../lib/helpers.js';
import { useSession } from 'next-auth/react';

import { useRouter } from 'next/navigation';

import { SEO } from '../seoConfig';

async function removeClass(classId) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/removeteachersCourses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                classId: classId,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to remove class');
        }

        return await response.json();
    } catch (error) {
        console.error('Error removing class:', error);
        throw error;
    }
}

async function addClass(courseId, startTime, endTime, repeatEveryNDay, classDescription, grade) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/addteachersCourses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                courseId,
                gradeId: grade,
                startTime,
                endTime,
                repeatEveryNDay,
                classDescription,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to add class');
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding class:', error);
        throw error;
    }
}

async function updateTeacherProfile(teacherId, profileData) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/updateTeacherProfile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                teacherId,
                ...profileData
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update teacher profile');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating teacher profile:', error);
        throw error;
    }
}

export default function LMSHome() {
    const { data: session, status, update } = useSession();
    const [classesData, setClassesData] = useState(null);
    const router = useRouter();
    const [addClassOverLayState, setAddClassOverlayState] = useState(false);
    const [editProfileOverlayState, setEditProfileOverlayState] = useState(false);
    const [addClassError, setAddClassError] = useState('');
    const [editProfileError, setEditProfileError] = useState('');
    const [courseData, setCourseData] = useState([]);
    const [gradeData, setGradeData] = useState([]);
    const [pendingTeachersData, setPendingTeachersData] = useState([]);
    const [showClassDeleters, setShowClassDeleters] = useState(false);
    const [teacherProfile, setTeacherProfile] = useState(null);

    useEffect(() => {
        if (!session) return;
        const token = localStorage.getItem('authToken');

        const fetchUserData = async () => {
            try {
                if (session.user.level === 0) {
                    const viewData = await fetchViewData('classes_view');
                    const classUsersData = await fetchData('classes_users', token);

                    const courseArray = [];
                    for (let i = 0; i < classUsersData.length; i++) {
                        if (classUsersData[i].user_id === session.user.id) {
                            for (let j = 0; j < viewData.length; j++) {
                                if (viewData[j].class_id === classUsersData[i].class_id) {
                                    courseArray.push(viewData[j]);
                                }
                            }
                        }
                    }
                    setClassesData(courseArray);
                } else if (session.user.level === 1) {
                    const data = await fetchJoinableData(
                        ['classes', 'courses', 'grades'],
                        ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
                        '*',
                        { 'classes.teacher_id': session.user.id }
                    );
                    setClassesData(data);

                    const coursesData = await fetchData('courses', token);
                    setCourseData(coursesData);

                    const gradesData = await fetchData('grades', token);
                    setGradeData(gradesData);

                    // Fetch teacher profile data
                    const response = await fetchViewData('teachers_view', token);
                    if (response.ok) {
                        const profileData = await response.json();
                        setTeacherProfile(profileData);
                    }
                } else if (session.user.level === 2) {
                    const response = await fetchData('pending_teachers', token);
                    const data = await response;
                    
                    setPendingTeachersData(data);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchUserData();
    }, [session]);

    const handleAddClass = async (e) => {
        setAddClassError('');
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const startTime = formData.get('startTime');
        const startDate = formData.get('startDate');
        const endTime = formData.get('endTime');
        const endDate = formData.get('endDate');
        const classDescription = formData.get('classDescription');
        const repeatEveryNDay = formData.get('repeatEveryNDay');
        const grade = parseInt(formData.get('grade'));
        const courseId = parseInt(formData.get('course'));

        if (!startTime || !endTime || !startDate || !endDate || !courseId || !grade || !repeatEveryNDay) {
            setAddClassError('Please fill in all required fields');
            return;
        }

        const start = startDate + 'T' + startTime;
        const end = endDate + 'T' + endTime;
        try {
            await addClass(courseId, start, end, repeatEveryNDay, classDescription, grade);
            setAddClassError('Successfully added class');
            await update();
            setTimeout(() => {
                setAddClassOverlayState(false);
            }, 1500);
        } catch (error) {
            setAddClassError(`Failed to add class: ${error.message}`);
        }
    };

    const handleEditProfile = async (e) => {
        setEditProfileError('');
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name');
        const email = formData.get('email');
        const bio = formData.get('bio');
        const qualifications = formData.get('qualifications');
        const contactHours = formData.get('contactHours');

        if (!name || !email) {
            setEditProfileError('Name and email are required');
            return;
        }

        try {
            await updateTeacherProfile(session.user.id, {
                name,
                email,
                bio,
                qualifications,
                contactHours
            });

            setTeacherProfile({
                ...teacherProfile,
                name,
                email,
                bio,
                qualifications,
                contactHours
            });

            setEditProfileError('Profile updated successfully');

            setTimeout(() => {
                setEditProfileOverlayState(false);
            }, 1500);
        } catch (error) {
            setEditProfileError(`Failed to update profile: ${error.message}`);
        }
    };

    const handleRemoveClass = async (classId) => {
        try {
            await removeClass(classId);
            await update();

            // Refresh classes data
            if (session && session.user.level === 1) {
                const data = await fetchJoinableData(
                    ['classes', 'courses', 'grades'],
                    ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
                    '*',
                    { 'classes.teacher_id': session.user.id }
                );
                setClassesData(data);
            }
        } catch (error) {
            console.error('Error removing class:', error);
        }
    };

    const renderContent = () => {
        if (status === 'loading') {
            return <Loading />;
        }

        if (status !== 'authenticated') {
            return (
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
            );
        }

        return (
            <>
                <h1 className={styles.title}>Home</h1>
                {session && (
                    <p>
                        {session.user.level === 0
                            ? 'Welcome to Enrolled courses!'
                            : session.user.level === 1
                                ? 'Welcome to your classes.'
                                : 'Welcome to your control panel.'}
                    </p>
                )}

                {renderUserContent()}
            </>
        );
    };

    const renderUserContent = () => {
        if (!session) return null;
        if (session.user.level === 0) {
            return renderStudentContent();
        } else if (session.user.level === 1) {
            return renderTeacherContent();
        } else if (session.user.level === 2) {
            return <AdminControl pendingTeachersData={pendingTeachersData} />;
        }

        return null;
    };

    const renderStudentContent = () => {
        if (!classesData) return <Loading />;

        return (
            <div className={styles.classCards}>
                {classesData.map((classData) => (
                    <div className={styles.classCard} key={classData.class_id}>
                        <h2>
                            {classData.course_name[0].toUpperCase() + classData.course_name.slice(1)}
                            <span> - {classData.user_name}</span>
                        </h2>
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
        );
    };

    const renderTeacherProfile = () => {
        if (!teacherProfile) return null;

        return (
            <div className={styles.profileCard}>
                <h2>Teacher Profile</h2>
                <div className={styles.profileDetails}>
                    <p><strong>Name:</strong> {teacherProfile.name}</p>
                    <p><strong>Email:</strong> {teacherProfile.email}</p>
                    {teacherProfile.bio && (
                        <p><strong>Bio:</strong> {teacherProfile.bio}</p>
                    )}
                    {teacherProfile.qualifications && (
                        <p><strong>Qualifications:</strong> {teacherProfile.qualifications}</p>
                    )}
                    {teacherProfile.contactHours && (
                        <p><strong>Contact Hours:</strong> {teacherProfile.contactHours}</p>
                    )}
                </div>
                <button
                    className={styles.editProfileButton}
                    onClick={() => setEditProfileOverlayState(true)}>
                    Edit Profile
                </button>
            </div>
        );
    };

    const renderTeacherContent = () => {
        return (
            <>
                {renderTeacherProfile()}

                <h2 className={styles.sectionTitle}>Your Classes</h2>
                {classesData ?
                    classesData.length > 0 && (
                        <div className={styles.classCards}>
                            {classesData.map((classData) => (
                                <div className={styles.classCard} key={classData.class_id}>
                                    <h2>
                                        {classData.course_name[0].toUpperCase() +
                                            classData.course_name.slice(1)}
                                        <span className={styles.time}>
                                            {' '}
                                            {getDate(classData.start_time).hhmmss} to {getDate(classData.end_time).hhmmss}
                                            {" "} and {" "}
                                            {getDate(classData.start_time).yyyymmdd} to {getDate(classData.end_time).yyyymmdd}
                                        </span>
                                    </h2>
                                    <span className={styles.gradeName}> for {classData.grade_name}</span>
                                    <span className={styles.repeatDay}>repeats every {classData.repeat_every_n_day} days</span>
                                    <p>{classData.class_description}</p>
                                    <span className={styles.classDetails}>
                                        <button
                                            className={styles.classDetailsButton}
                                            onClick={() => router.push(`/classes/${classData.class_id}`)}>
                                            View Class
                                        </button>
                                    </span>
                                    {showClassDeleters && (
                                        <div className={styles.classDeleter}>
                                            <button
                                                className={styles.classDeleterButton}
                                                onClick={() => handleRemoveClass(classData.class_id)}>
                                                X
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : <Loading />}
                <span className={styles.flexyspan}>
                    <button
                        className={styles.addClass}
                        onClick={() => {
                            setAddClassOverlayState(true);
                        }}>
                        Add Class
                    </button>
                    <button
                        className={styles.deleteClassBtnToggle}
                        onClick={() => setShowClassDeleters(!showClassDeleters)}>
                        {showClassDeleters ? 'Return' : 'Delete Class'}
                    </button>
                </span>
            </>
        );
    };

    return (
        <div className={styles.container}>
            <SEO pageTitle="lmshome" />
            {renderContent()}

            {addClassOverLayState && (
                <div className={styles.addClassOverlay}>
                    <div className={styles.addClassOverlayContent}>
                        <h1>Add Class</h1>
                        <form
                            className={styles.addClassOverlayForm}
                            onSubmit={handleAddClass}>
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
                            <Input label="Start Date" type="date" name="startDate" id="startDate" required />
                            <Input label="End Date" type="date" name="endDate" id="endDate" required />
                            <Input label="Every ? Days" type="number" name="repeatEveryNDay" id="repeatEveryNDay" required />
                            <Input
                                label="Class Description"
                                type="textarea"
                                name="classDescription"
                                id="classDescription"
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

            {editProfileOverlayState && (
                <div className={styles.editProfileOverlay}>
                    <div className={styles.editProfileOverlayContent}>
                        <h1>Edit Teacher Profile</h1>
                        <form
                            className={styles.editProfileOverlayForm}
                            onSubmit={handleEditProfile}>
                            <Input
                                label="Name"
                                type="text"
                                name="name"
                                id="name"
                                required
                                defaultValue={teacherProfile?.name || ''}
                            />
                            <Input
                                label="Email"
                                type="email"
                                name="email"
                                id="email"
                                required
                                defaultValue={teacherProfile?.email || ''}
                            />
                            <Input
                                label="Bio"
                                type="textarea"
                                name="bio"
                                id="bio"
                                defaultValue={teacherProfile?.bio || ''}
                            />
                            <Input
                                label="Qualifications"
                                type="textarea"
                                name="qualifications"
                                id="qualifications"
                                defaultValue={teacherProfile?.qualifications || ''}
                            />
                            <Input
                                label="Contact Hours"
                                type="text"
                                name="contactHours"
                                id="contactHours"
                                placeholder="e.g. Mon-Fri 2-4 PM"
                                defaultValue={teacherProfile?.contactHours || ''}
                            />
                            {editProfileError && <p className={styles.errorDisplay}>{editProfileError}</p>}
                            <button type="submit" className={styles.editProfileOverlaySubmitButton}>
                                Update Profile
                            </button>
                        </form>
                        <button
                            onClick={() => {
                                setEditProfileOverlayState(false);
                            }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
