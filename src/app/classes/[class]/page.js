'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import '../../global.css';
import styles from '../../../styles/ClassDetails.module.css';
import Loading from '../../components/Loading';
import { fetchData, fetchViewData, fetchJoinableData } from '../../lib/helpers';
import ClassContent from '../../components/ClassContent';

// Utils
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'TBD';

    try {
        if (!dateTimeString.includes('T') && !dateTimeString.endsWith('Z')) {
            return dateTimeString;
        }

        const date = new Date(dateTimeString);
        const datePart = new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        }).format(date);
        const timePart = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true
        }).format(date);

        return `${datePart} at ${timePart}`;
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateTimeString;
    }
};

const isClassActive = (startTime, endTime) => {
    if (!startTime || !endTime) return false;
    const now = new Date();
    return now >= new Date(startTime) && now <= new Date(endTime);
};

const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// API calls
const apiCall = async (endpoint, method, body, token) => {
    const response = await fetch(endpoint, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API call failed: ${response.status}`);
    }

    return response.json();
};

// Custom hooks
const useClassData = (classId, session) => {
    const [classDetails, setClassDetails] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!classId) return;

        const fetchClassData = async () => {
            try {
                setLoading(true);
                setError(null);

                const classData = await fetchJoinableData(
                    ['classes', 'courses', 'grades'],
                    ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
                    '*',
                    { 'classes.class_id': classId },
                    session?.accessToken
                );

                if (classData?.length > 0) {
                    setClassDetails(classData[0]);

                    const teacherData = await fetchViewData('teachers_view');
                    const matchedTeacher = teacherData?.find(t => t.user_id === classData[0].teacher_id);
                    if (matchedTeacher) setTeacher(matchedTeacher);
                } else {
                    setError('Class not found');
                }
            } catch (err) {
                console.error('Error fetching class data:', err);
                setError('Failed to load class information. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchClassData();
    }, [classId, session?.accessToken]);

    return { classDetails, setClassDetails, teacher, loading, error };
};

const useStudents = (classId, session, classDetails) => {
    const [students, setStudents] = useState([]);

    useEffect(() => {
        if (!classId || !session || session.user?.level !== 1) return;

        const fetchStudentData = async () => {
            try {
                const [studentsData, classesData] = await Promise.all([
                    fetchViewData('students_view'),
                    fetchData('classes_users')
                ]);

                const classMap = new Map(classesData.map(entry => [entry.user_id, entry]));
                const studentData = studentsData.map(student => ({
                    ...student,
                    ...classMap.get(student.user_id) || {}
                }));

                const classStudents = studentData.filter(
                    student => parseInt(student.class_id) === parseInt(classId)
                );
                setStudents(classStudents);
            } catch (err) {
                console.error('Error fetching student data:', err);
            }
        };

        fetchStudentData();
    }, [classId, session, classDetails]);

    return { students, setStudents };
};

// Components
const Toast = ({ message, type = 'error', onClose }) => (
    <div className={`${styles.toast} ${type === 'success' ? styles.successToast : ''}`}>
        <div className={styles.toastContent}>
            <span className={styles.toastMessage}>{message}</span>
            <button className={styles.toastClose} onClick={onClose}>✕</button>
        </div>
    </div>
);

const MeetingUrlEditor = ({
    meetingUrl,
    onUpdate,
    onRegenerate,
    isUpdating,
    isRegenerating
}) => {
    const [editMode, setEditMode] = useState(false);
    const [urlInput, setUrlInput] = useState(meetingUrl || '');
    const [urlError, setUrlError] = useState('');

    const handleSave = () => {
        if (!urlInput.trim()) {
            setUrlError('Meeting URL cannot be empty');
            return;
        }

        if (!isValidUrl(urlInput.trim())) {
            setUrlError('Please enter a valid URL');
            return;
        }

        setUrlError('');
        onUpdate(urlInput.trim());
        setEditMode(false);
    };

    const handleCancel = () => {
        setUrlInput(meetingUrl || '');
        setUrlError('');
        setEditMode(false);
    };

    return (
        <div className={styles.meetingUrlEditor}>
            {editMode ? (
                <div className={styles.urlInputGroup}>
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Enter meeting URL"
                        className={`${styles.urlInput} ${urlError ? styles.error : ''}`}
                    />
                    {urlError && <span className={styles.errorText}>{urlError}</span>}
                    <div className={styles.urlActions}>
                        <button
                            onClick={handleSave}
                            disabled={isUpdating}
                            className={styles.saveButton}
                        >
                            {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={handleCancel} className={styles.cancelButton}>
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className={styles.urlDisplay}>
                    <span className={styles.urlText}>
                        {meetingUrl || 'No meeting URL set'}
                    </span>
                    <div className={styles.urlActions}>
                        <button
                            onClick={() => setEditMode(true)}
                            className={styles.editButton}
                        >
                            Edit
                        </button>
                        <button
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                            className={styles.regenerateButton}
                        >
                            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ActionButtons = ({
    isTeacher,
    isEnrolled,
    classActive,
    hasMeetingLink,
    isJoining,
    status,
    onJoinClass,
    onJoinMeeting
}) => (
    <div className={styles.buttonGroup}>
        {!isTeacher && (
            <button
                className={`${styles.joinButton} ${isEnrolled ? styles.enrolled : ''}`}
                onClick={status === 'authenticated' && !isJoining && !isEnrolled ? onJoinClass : null}
                disabled={isJoining || isEnrolled}
                title={status !== 'authenticated' ? 'Login to join class' : ''}
            >
                {isJoining ? 'Joining...' :
                    isEnrolled ? 'Enrolled' :
                        status === 'authenticated' ? 'Join Class' : 'Login to Join'}
            </button>
        )}

        {(isEnrolled || isTeacher) && (
            <button
                className={`${styles.joinButton} ${styles.meetingButton}`}
                onClick={onJoinMeeting}
                disabled={!hasMeetingLink || !classActive}
                title={!hasMeetingLink ? 'No meeting link available' :
                    !classActive ? 'Class is not currently active' :
                        'Join online meeting'}
            >
                Join Meeting
            </button>
        )}
    </div>
);

const StudentsList = ({ students }) => (
    <div className={styles.studentsSection}>
        <h3>Enrolled Students ({students.length})</h3>
        {students.length > 0 ? (
            <ul className={styles.studentList}>
                {students.map((student) => (
                    <li key={student.user_id} className={styles.studentCard}>
                        <div className={styles.studentName}>{student.user_name}</div>
                        <div className={styles.studentEmail}>{student.user_email}</div>
                    </li>
                ))}
            </ul>
        ) : (
            <p className={styles.emptyState}>No students enrolled yet.</p>
        )}
    </div>
);

// Main component
export default function ClassDetailsPage({ params }) {
    const router = useRouter();
    const classId = use(params)?.class;
    const { data: session, status } = useSession();

    const { classDetails, setClassDetails, teacher, loading, error } = useClassData(classId, session);
    const { students, setStudents } = useStudents(classId, session, classDetails);

    const [isJoining, setIsJoining] = useState(false);
    const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState('error');

    const showToast = (message, type = 'error') => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const isTeacher = session?.user?.id === classDetails?.teacher_id;
    const classActive = classDetails ? isClassActive(classDetails.start_time, classDetails.end_time) : false;
    const hasMeetingLink = classDetails?.meeting_url && classDetails.meeting_url !== '';
    const isEnrolled = students.some(s => s.user_id === session?.user?.id);

    const joinClass = async () => {
        if (!session) {
            router.push('/registration/login');
            return;
        }

        setIsJoining(true);
        try {
            await apiCall('/api/joinClass', 'POST', {
                classId,
                userId: session.user.id
            }, session.accessToken);

            if (!students.some(s => s.user_id === session.user.id)) {
                setStudents(prev => [...prev, {
                    user_id: session.user.id,
                    class_id: classId,
                    user_name: session.user.name,
                    user_email: session.user.email
                }]);
            }
        } catch (err) {
            console.error('Error joining class:', err);
            showToast(err.message || 'Failed to join class. Please try again.');
        } finally {
            setIsJoining(false);
        }
    };

    const updateMeetingUrl = async (newUrl) => {
        if (!session || !isTeacher) {
            showToast('Only teachers can update meeting URLs');
            return;
        }

        setIsUpdatingUrl(true);
        try {
            const response = await fetch('/api/updateMeetingUrl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify({ classId, meetingUrl: newUrl }),
            });

            if (response.ok) {
                setClassDetails(prev => ({ ...prev, meeting_url: newUrl }));
                showToast('Meeting URL updated successfully', 'success');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update meeting URL');
            }
        } catch (err) {
            console.error('Error updating meeting URL:', err);
            showToast(err.message || 'Failed to update meeting URL. Please try again.');
        } finally {
            setIsUpdatingUrl(false);
        }
    };

    const regenerateMeetingLink = async () => {
        if (!session || !isTeacher) {
            showToast('Only teachers can regenerate meeting links');
            return;
        }

        setIsRegenerating(true);
        try {
            const data = await apiCall('/api/createMeeting', 'POST', {
                classId,
                startDate: classDetails.start_time,
                endDate: classDetails.end_time,
                className: classDetails.course_name
            }, session.accessToken);

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
        window.open(classDetails.meeting_url, '_blank');
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

    return (
        <div className={styles.container}>
            <main className={styles.mainSection}>
                <div className={styles.classCard}>
                    <div className={styles.classHeader}>
                        <h1 className={styles.title}>
                            {classDetails.course_name} ({classDetails.grade_name})
                        </h1>

                        <ActionButtons
                            isTeacher={isTeacher}
                            isEnrolled={isEnrolled}
                            classActive={classActive}
                            hasMeetingLink={hasMeetingLink}
                            isJoining={isJoining}
                            status={status}
                            onJoinClass={joinClass}
                            onJoinMeeting={joinMeeting}
                        />
                    </div>

                    <div className={styles.infoSection}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Teacher</span>
                            <div
                                className={styles.teacherBadge}
                                onClick={() => router.push(`/profile/${teacher?.user_id}`)}
                            >
                                {teacher ? teacher.user_name : 'Unavailable'}
                            </div>
                        </div>

                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Schedule</span>
                            <div className={styles.scheduleBadge}>
                                {formatDateTime(classDetails.start_time)} - {formatDateTime(classDetails.end_time)}
                            </div>
                        </div>

                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Meeting Status</span>
                            <div className={`${styles.statusBadge} ${classActive ? styles.active : styles.inactive}`}>
                                {classActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        {isTeacher && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Meeting URL</span>
                                <MeetingUrlEditor
                                    meetingUrl={classDetails.meeting_url}
                                    onUpdate={updateMeetingUrl}
                                    onRegenerate={regenerateMeetingLink}
                                    isUpdating={isUpdatingUrl}
                                    isRegenerating={isRegenerating}
                                />
                            </div>
                        )}
                    </div>

                    <div className={styles.courseDescription}>
                        <h3>Course Description</h3>
                        <p>{classDetails.course_details}</p>
                    </div>

                    <ClassContent classId={classId} isTeacher={isTeacher} />

                    {session.user?.level === 1 && (
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
