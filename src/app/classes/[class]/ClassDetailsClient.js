// ClassDetailsClient.jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../../global.css';
import styles from '../../../styles/ClassDetails.module.css';
import Loading from '../../components/Loading';
import ClassContent from '../../components/ClassContent';
import { useClassData } from '../../../hooks/useClassData';
import { useStudents } from '../../../hooks/useStudents';
import { Toast } from '../../components/Toast';
import { MeetingUrlEditor } from '../../components/MeetingUrlEditor';
import { MeetingButton } from '../../components/MeetingButton';
import { StudentsList } from '../../components/StudentsList';
import { ClassInfo } from '../../components/ClassInfo';
import { updateMeetingUrl, regenerateMeetingLink } from '../../../utils/classActions';
import {
    isClassCurrentlyJoinable,
    isClassAvailableToday,
    parseRepeatPattern
} from '../../../utils/classStatus';

/**
 * Handle meeting join with validation
 */
const handleMeetingJoin = (classDetails, repeatPattern, showToast) => {
    if (!classDetails?.meeting_url) {
        showToast('No meeting link available');
        return;
    }

    const isValidDay = isClassAvailableToday(classDetails.start_time, classDetails.end_time, repeatPattern);
    const isJoinable = isClassCurrentlyJoinable(classDetails.start_time, classDetails.end_time, repeatPattern);

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
};

/**
 * Handle meeting URL manual update (when teacher enters URL manually)
 */
const handleUrlUpdate = async (session, isClassOwner, classId, newUrl, setClassDetails, showToast, setIsUpdating) => {
    setIsUpdating(true);
    try {
        await updateMeetingUrl(session, isClassOwner, true, classId, newUrl);
        setClassDetails(prev => ({ ...prev, meeting_url: newUrl }));
        showToast('Meeting URL updated successfully', 'success');
    } catch (err) {
        console.error('Error updating meeting URL:', err);
        showToast(err.message || 'Failed to update meeting URL. Please try again.');
    } finally {
        setIsUpdating(false);
    }
};

/**
 * Generate new meeting link (returns promise with new URL)
 */
const generateNewMeetingLink = async (session, isClassOwner, classId, classDetails, showToast) => {
    try {
        const data = await regenerateMeetingLink(session, isClassOwner, true, classId, classDetails, false);
        return data.meetingUrl;
    } catch (err) {
        console.error('Error generating meeting link:', err);
        showToast(err.message || 'Failed to generate meeting link. Please try again.');
        throw err;
    }
};

/**
 * Update database after meeting regeneration (this is already handled by the API)
 */
const updateDatabaseAfterRegeneration = async (newUrl, setClassDetails, showToast, session, classId) => {
    try {
        // Now we need to actually update the database
        await updateMeetingUrl(session, true, true, classId, newUrl);

        // Update local state
        setClassDetails(prev => ({ ...prev, meeting_url: newUrl }));
        showToast('Meeting link saved successfully!', 'success');
    } catch (err) {
        console.error('Error updating database:', err);
        showToast('Failed to save meeting link. Please try again.');
        throw err;
    }
};

/**
 * Show teacher reminder notification
 */
const showTeacherReminder = (showToast) => {
    showToast('Remember: Make sure you really are the first to join the class!', 'info');
};

export default function ClassDetailsClient({ classId, session }) {
    const router = useRouter();
    const { classDetails, setClassDetails, teacher, loading, error } = useClassData(classId, session);
    const isClassOwner = session?.user?.id === classDetails?.teacher_id;
    const { students } = useStudents(classId, session, isClassOwner);
    console.log(students);

    const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState('error');

    const showToast = (message, type = 'error') => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), type === 'info' ? 5000 : 3000);
    };

    if (loading) return <Loading />;

    if (error && !classDetails) {
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

    const repeatPattern = classDetails?.repeat_every_n_day;
    const classJoinable = classDetails ? isClassCurrentlyJoinable(classDetails.start_time, classDetails.end_time, repeatPattern) : false;
    const isValidDay = classDetails ? isClassAvailableToday(classDetails.start_time, classDetails.end_time, repeatPattern) : false;
    const hasMeetingLink = classDetails?.meeting_url && classDetails.meeting_url !== '';

    const joinMeeting = () => handleMeetingJoin(classDetails, repeatPattern, showToast);

    const handleUpdateMeetingUrl = (newUrl) =>
        handleUrlUpdate(session, isClassOwner, classId, newUrl, setClassDetails, showToast, setIsUpdatingUrl);

    /**
     * Enhanced regenerate function that works with the new MeetingUrlEditor
     */
    const handleRegenerateMeetingLink = async () => {
        setIsRegenerating(true);
        try {
            // This returns a promise with the new URL
            const newUrl = await generateNewMeetingLink(session, isClassOwner, classId, classDetails, showToast);
            return newUrl;
        } catch (err) {
            throw err; // Re-throw to let MeetingUrlEditor handle the error
        } finally {
            setIsRegenerating(false);
        }
    };

    /**
     * Database update handler (called after successful regeneration)
     */
    const handleDatabaseUpdate = async (newUrl) => {
        await updateDatabaseAfterRegeneration(newUrl, setClassDetails, showToast, session, classId); 

        // Show reminder after a short delay
        setTimeout(() => {
            showTeacherReminder(showToast);
        }, 1000);
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

                    <ClassContent classId={classId} isTeacher={isClassOwner} currentUser={session?.user} />

                    {isClassOwner && (
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
