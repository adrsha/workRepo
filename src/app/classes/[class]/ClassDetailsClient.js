'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../global.css';
import styles from '../../../styles/ClassDetails.module.css';
import Loading from '../../components/Loading';
import ClassContent from '../../components/ClassContent';
import { Toast } from '../../components/Toast';
import { MeetingUrlEditor } from '../../components/MeetingUrlEditor';
import { MeetingButton } from '../../components/MeetingButton';
import { StudentsList } from '../../components/StudentsList';
import { ClassInfo } from '../../components/ClassInfo';
import { updateMeetingUrl, regenerateMeetingLink } from '../../../utils/classActions';
import { checkClassAccess, getClassStudents, getTeacherInfo } from '../../lib/helpers.js';
import {
    isClassCurrentlyJoinable,
    isClassAvailableToday,
    parseRepeatPattern
} from '../../../utils/classStatus';

function handleMeetingJoin(classDetails, repeatPattern, showToast) {
    if (!classDetails?.meeting_url) {
        showToast('No meeting link available');
        return;
    }

    const isValidDay    = isClassAvailableToday(classDetails.start_time, classDetails.end_time, repeatPattern);
    const isJoinable    = isClassCurrentlyJoinable(classDetails.start_time, classDetails.end_time, repeatPattern);

    if (!isValidDay) {
        const pattern = parseRepeatPattern(repeatPattern);
        if (pattern) {
            let message = 'Class is not available today. ';
            switch (pattern.type) {
                case 'weekdays':
                    message += 'This class is only available on weekdays.';
                    break;
                case 'custom':
                    message += 'This class has a custom schedule.';
                    break;
                default:
                    message += 'Please check the class schedule.';
            }
            showToast(message);
        } else {
            showToast('Class is not available today');
        }
        return;
    }

    if (!isJoinable) {
        showToast('Class is not currently active');
        return;
    }

    window.open(classDetails.meeting_url, '_blank');
}

export default function ClassDetailsClient({ classId, session }) {
    const router = useRouter();

    // State for data
    const [classDetails, setClassDetails] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [students, setStudents] = useState([]);
    const [isClassOwner, setIsClassOwner] = useState(false);
    
    // State for UI
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState('error');

    const userId    = session?.user?.id;
    const userLevel = session?.user?.level;
    const isAdmin   = userLevel === 2;

    const showToast = (message, type = 'error') => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), type === 'info' ? 5000 : 3000);
    };

    // Fetch data on mount
    useEffect(() => {
        const fetchClassData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Check class access
                const accessCheck = await checkClassAccess(classId, session.accessToken);
                if (!accessCheck.hasAccess) {
                    setError(accessCheck.error || 'Access denied');
                    return;
                }

                // Set class details and ownership
                setClassDetails(accessCheck.classDetails);
                setIsClassOwner(accessCheck.isTeacher);

                // Fetch teacher info
                if (accessCheck.classDetails.teacher_id) {
                    try {
                        const teacherData = await getTeacherInfo(
                            accessCheck.classDetails.teacher_id, 
                            session.accessToken
                        );
                        setTeacher(teacherData);
                    } catch (teacherError) {
                        console.warn('Failed to load teacher info:', teacherError);
                        // Don't set error - teacher info is not critical
                    }
                }

                // Fetch students if user is teacher or admin
                if (accessCheck.isTeacher || isAdmin) {
                    try {
                        const studentsData = await getClassStudents(
                            classId, 
                            accessCheck.isTeacher, 
                            isAdmin, 
                            session.accessToken
                        );
                        setStudents(studentsData || []);
                    } catch (studentsError) {
                        console.warn('Failed to load students:', studentsError);
                        // Don't set error - students list is not critical for basic functionality
                    }
                }

            } catch (err) {
                console.error('Error fetching class data:', err);
                setError('Failed to load class data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        if (classId && session?.accessToken) {
            fetchClassData();
        } else {
            setError('Missing required data');
            setIsLoading(false);
        }
    }, [classId, session?.accessToken, isAdmin]);

    // Handle error state
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorCard}>
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading || !classDetails) {
        return <Loading />;
    }

    const repeatPattern = classDetails?.repeat_every_n_day;
    const classJoinable = classDetails ? isClassCurrentlyJoinable(
        classDetails.start_time, 
        classDetails.end_time, 
        repeatPattern
    ) : false;
    const isValidDay    = classDetails ? isClassAvailableToday(
        classDetails.start_time, 
        classDetails.end_time, 
        repeatPattern
    ) : false;
    const hasMeetingLink = classDetails?.meeting_url && classDetails.meeting_url !== '';

    const joinMeeting = () => handleMeetingJoin(classDetails, repeatPattern, showToast);

    const handleUpdateMeetingUrl = async (newUrl) => {
        setIsUpdatingUrl(true);
        try {
            await updateMeetingUrl(session, isClassOwner, true, classId, newUrl);
            setClassDetails(prev => ({ ...prev, meeting_url: newUrl }));
            showToast('Meeting URL updated successfully', 'success');
        } catch (err) {
            console.error('Error updating meeting URL:', err);
            showToast(err.message || 'Failed to update meeting URL. Please try again.');
        } finally {
            setIsUpdatingUrl(false);
        }
    };

    const handleRegenerateMeetingLink = async () => {
        setIsRegenerating(true);
        try {
            const data = await regenerateMeetingLink(
                session, 
                isClassOwner, 
                true, 
                classId, 
                classDetails, 
                false
            );
            return data;
        } catch (err) {
            console.error('Error generating meeting link:', err);
            showToast(err.message || 'Failed to generate meeting link. Please try again.');
            throw err;
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleDatabaseUpdate = async (newUrl) => {
        try {
            await updateMeetingUrl(session, true, true, classId, newUrl);
            setClassDetails(prev => ({ ...prev, meeting_url: newUrl }));
            showToast('Meeting link saved successfully!', 'success');

            // Show reminder after a short delay
            setTimeout(() => {
                showToast('Remember: Make sure you really are the first to join the class!', 'info');
            }, 1000);
        } catch (err) {
            console.error('Error updating database:', err);
            showToast('Failed to save meeting link. Please try again.');
            throw err;
        }
    };

    return (
        <div className={styles.container}>
            <main className={styles.mainSection}>
                <div className={styles.classCard}>
                    <div className={styles.classHeader}>
                        <h1 className={styles.title}>
                            {classDetails.course_name} ({classDetails.grade_name})
                        </h1>

                        <MeetingButton
                            onJoinMeeting={joinMeeting}
                            hasMeetingLink={hasMeetingLink}
                            classJoinable={classJoinable}
                            repeatPattern={repeatPattern}
                            isValidDay={isValidDay}
                        />
                    </div>

                    <ClassInfo
                        classDetails={classDetails}
                        teacher={teacher}
                        router={router}
                    />

                    {isClassOwner && (
                        <div className={styles.infoSection}>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Meeting URL</span>
                                <MeetingUrlEditor
                                    session={session}
                                    meetingUrl={classDetails.meeting_url}
                                    onUpdate={handleUpdateMeetingUrl}
                                    onRegenerate={handleRegenerateMeetingLink}
                                    onDatabaseUpdate={handleDatabaseUpdate}
                                    isUpdating={isUpdatingUrl}
                                    isRegenerating={isRegenerating}
                                    classDetails={classDetails}
                                    isTeacher={isClassOwner}
                                    useCustomModal={true}
                                />
                            </div>
                        </div>
                    )}

                    <div className={styles.courseDescription}>
                        <h3>Course Description</h3>
                        <p>{classDetails.course_details}</p>
                    </div>

                    <ClassContent 
                        classId={classId} 
                        isTeacher={isClassOwner} 
                        currentUser={session?.user} 
                    />

                    {(isClassOwner || isAdmin) && (
                        <StudentsList students={students} />
                    )}
                </div>
            </main>

            {toastMessage && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </div>
    );
}
