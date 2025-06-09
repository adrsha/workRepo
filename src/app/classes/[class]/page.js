'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import '../../global.css';
import styles from '../../../styles/ClassDetails.module.css';
import Loading from '../../components/Loading';
import { fetchJoinableData, fetchViewData } from '../../lib/helpers';
import ClassContent from '../../components/ClassContent';

// Date and time utilities
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'TBD';

    try {
        if (!dateTimeString.includes('T') && !dateTimeString.endsWith('Z')) {
            return dateTimeString;
        }

        const date = new Date(dateTimeString);
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        }).format(date);
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

const isClassInPast = (endTime) => {
    if (!endTime) return false;
    return new Date() > new Date(endTime);
};

// Validation utilities
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// API utilities
const makeApiCall = async (endpoint, method, body, token) => {
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
                    await fetchTeacherData(classData[0].teacher_id);
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

        const fetchTeacherData = async (teacherId) => {
            try {
                const teacherData = await fetchViewData('teachers_view');
                const matchedTeacher = teacherData?.find(t => t.user_id === teacherId);
                if (matchedTeacher) setTeacher(matchedTeacher);
            } catch (err) {
                console.error('Error fetching teacher data:', err);
            }
        };

        fetchClassData();
    }, [classId, session?.accessToken]);

    return { classDetails, setClassDetails, teacher, loading, error };
};

const useStudents = (classId, session, isTeacher) => {
    const [students, setStudents] = useState([]);

    useEffect(() => {
        if (!classId || !session || !isTeacher) return;

        const fetchStudentData = async () => {
            try {
                const [studentsData, classesData] = await Promise.all([
                    fetchViewData('students_view'),
                    fetchViewData('classes_users')
                ]);

                const registeredStudents = classesData
                    .filter(entry => parseInt(entry.class_id) === parseInt(classId))
                    .map(entry => {
                        const student = studentsData.find(s => s.user_id === entry.user_id);
                        return student ? { ...student, ...entry } : null;
                    })
                    .filter(Boolean);

                setStudents(registeredStudents);
            } catch (err) {
                console.error('Error fetching student data:', err);
            }
        };

        fetchStudentData();
    }, [classId, session, isTeacher]);

    return { students };
};

// Toast notification component
const Toast = ({ message, type = 'error', onClose }) => (
    <div className={`${styles.toast} ${type === 'success' ? styles.successToast : ''}`}>
        <div className={styles.toastContent}>
            <span className={styles.toastMessage}>{message}</span>
            <button className={styles.toastClose} onClick={onClose}>✕</button>
        </div>
    </div>
);

// Meeting URL editor component
const MeetingUrlEditor = ({
    meetingUrl,
    onUpdate,
    onRegenerate,
    isUpdating,
    isRegenerating,
    canEdit
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

    if (!canEdit) {
        return (
            <div className={styles.meetingUrlEditor}>
                <div className={styles.urlDisplay}>
                    <span className={styles.urlText}>
                        {meetingUrl || 'No meeting URL set'}
                    </span>
                    <div className={styles.disabledMessage}>
                        Meeting URL cannot be edited for past classes
                    </div>
                </div>
            </div>
        );
    }

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

// Meeting join button component
const MeetingButton = ({ onJoinMeeting, hasMeetingLink, classActive }) => (
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
);

// Students list component (for teachers only)
const StudentsList = ({ students }) => (
    <div className={styles.studentsSection}>
        <h3>Registered Students ({students.length})</h3>
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
            <p className={styles.emptyState}>No students registered yet.</p>
        )}
    </div>
);

// Class info section component
const ClassInfo = ({ classDetails, teacher, router }) => (
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
            <span className={styles.infoLabel}>Start Time</span>
            <div className={styles.scheduleBadge}>
                {formatDateTime(classDetails.start_time)}
            </div>
        </div>

        <div className={styles.infoRow}>
            <span className={styles.infoLabel}>End Time</span>
            <div className={styles.scheduleBadge}>
                {formatDateTime(classDetails.end_time)}
            </div>
        </div>

        <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Meeting Status</span>
            <div className={`${styles.statusBadge} ${
                isClassActive(classDetails.start_time, classDetails.end_time) 
                    ? styles.active 
                    : isClassInPast(classDetails.end_time) 
                        ? styles.inactive 
                        : styles.scheduled
            }`}>
                {isClassActive(classDetails.start_time, classDetails.end_time) 
                    ? 'Active' 
                    : isClassInPast(classDetails.end_time) 
                        ? 'Ended' 
                        : 'Scheduled'
                }
            </div>
        </div>
    </div>
);

// Main component
export default function ClassDetailsPage({ params }) {
    const router = useRouter();
    const classId = use(params)?.class;
    const { data: session, status } = useSession();

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

    const classActive = classDetails ? isClassActive(classDetails.start_time, classDetails.end_time) : false;
    const classInPast = classDetails ? isClassInPast(classDetails.end_time) : false;
    const hasMeetingLink = classDetails?.meeting_url && classDetails.meeting_url !== '';
    const canEditMeetingUrl = isTeacher && !classInPast;

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

        if (classInPast) {
            showToast('Cannot regenerate meeting link for past classes');
            return;
        }

        setIsRegenerating(true);
        try {
            const data = await makeApiCall('/api/createMeeting', 'POST', {
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

                        <MeetingButton
                            onJoinMeeting={joinMeeting}
                            hasMeetingLink={hasMeetingLink}
                            classActive={classActive}
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
                                onUpdate={updateMeetingUrl}
                                onRegenerate={regenerateMeetingLink}
                                isUpdating={isUpdatingUrl}
                                isRegenerating={isRegenerating}
                                canEdit={canEditMeetingUrl}
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
