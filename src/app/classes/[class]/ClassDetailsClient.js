'use client';
import { useState } from 'react';
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
}

export default function ClassDetailsClient({ initialData, classId, session }) {
    const router = useRouter();

    // State initialized with server data
    const [classDetails, setClassDetails] = useState(initialData.classDetails);
    const [teacher] = useState(initialData.teacher);
    const [students] = useState(initialData.students);
    const isClassOwner = initialData.isClassOwner;

    const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState('error');

    const showToast = (message, type = 'error') => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), type === 'info' ? 5000 : 3000);
    };

    // Handle error state
    if (initialData.error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorCard}>
                    <h2>Error</h2>
                    <p>{initialData.error}</p>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!classDetails) {
        return <Loading />;
    }

    const repeatPattern = classDetails?.repeat_every_n_day;
    const classJoinable = classDetails ? isClassCurrentlyJoinable(classDetails.start_time, classDetails.end_time, repeatPattern) : false;
    const isValidDay = classDetails ? isClassAvailableToday(classDetails.start_time, classDetails.end_time, repeatPattern) : false;
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
            const data = await regenerateMeetingLink(session, isClassOwner, true, classId, classDetails, false);
            return data.meetingUrl;
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
