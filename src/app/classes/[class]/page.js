'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { isClassJoinable, isClassInPast, isValidClassDay, canTeacherGenerateLink } from '../../../utils/dateTime';
import { updateMeetingUrl, regenerateMeetingLink } from '../../../utils/classActions';

export default function ClassDetailsPage({ params }) {
    const router = useRouter();
    const classId = use(params)?.class;
    const { data: session } = useSession();

    const { classDetails, setClassDetails, teacher, loading, error } = useClassData(classId, session);
    const isTeacher = session?.user?.id === classDetails?.teacher_id;
    const { students } = useStudents(classId, session, isTeacher);

    const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState('error');

    const showToast = (message, type = 'error') => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
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

    const repeatNDays = classDetails?.repeat_every_n_day;
    const classJoinable = classDetails ? isClassJoinable(classDetails.start_time, classDetails.end_time, repeatNDays) : false;
    const isValidDay = classDetails ? isValidClassDay(classDetails.start_time, repeatNDays) : false;
    const hasMeetingLink = classDetails?.meeting_url && classDetails.meeting_url !== '';
    const canEditMeetingUrl = isTeacher && canTeacherGenerateLink(classDetails?.start_time, classDetails?.end_time, repeatNDays);
    const canGenerateLink = isTeacher && canTeacherGenerateLink(classDetails?.start_time, classDetails?.end_time, repeatNDays);

    const handleUpdateMeetingUrl = async (newUrl) => {
        setIsUpdatingUrl(true);
        try {
            await updateMeetingUrl(session, isTeacher, canEditMeetingUrl, classId, newUrl);
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
            const data = await regenerateMeetingLink(session, isTeacher, canGenerateLink, classId, classDetails);
            setClassDetails(prev => ({ ...prev, meeting_url: data.meetingUrl }));
            showToast('Meeting link regenerated successfully', 'success');
        } catch (err) {
            console.error('Error regenerating meeting link:', err);
            showToast(err.message || 'Failed to regenerate meeting link. Please try again.');
        } finally {
            setIsRegenerating(false);
        }
    };

    const joinMeeting = () => {
        if (!classDetails?.meeting_url) {
            showToast('No meeting link available');
            return;
        }
        
        if (repeatNDays && !isValidDay) {
            showToast(`This class occurs every ${repeatNDays} days. Not available today.`);
            return;
        }
        
        if (!classJoinable) {
            showToast('Class is not currently active');
            return;
        }
        
        window.open(classDetails.meeting_url, '_blank');
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
                            repeatNDays={repeatNDays}
                            isValidDay={isValidDay}
                        />
                    </div>

                    <ClassInfo 
                        classDetails={classDetails} 
                        teacher={teacher} 
                        router={router} 
                    />

                    {isTeacher && (
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Meeting URL</span>
                            <MeetingUrlEditor
                                meetingUrl={classDetails.meeting_url}
                                onUpdate={handleUpdateMeetingUrl}
                                onRegenerate={handleRegenerateMeetingLink}
                                isUpdating={isUpdatingUrl}
                                isRegenerating={isRegenerating}
                                canEdit={canEditMeetingUrl}
                                canGenerate={canGenerateLink}
                            />
                        </div>
                    )}

                    <div className={styles.courseDescription}>
                        <h3>Course Description</h3>
                        <p>{classDetails.course_details}</p>
                    </div>

                    <ClassContent classId={classId} isTeacher={isTeacher} />

                    {isTeacher && (
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
