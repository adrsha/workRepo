'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import '../../global.css';
import styles from '../../../styles/ClassDetails.module.css';
import Loading from '../../components/Loading';
import { fetchData, fetchViewData, fetchJoinableData } from '../../lib/helpers';
import ClassContent from '../../components/ClassContent';

// Format ISO date strings to a more readable format
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'TBD';

  try {
    // Check if it's already in a readable format
    if (!dateTimeString.includes('T') && !dateTimeString.endsWith('Z')) {
      return dateTimeString;
    }

    const date = new Date(dateTimeString);

    // Format date part: "Apr 17, 2025"
    const datePart = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);

    // Format time part: "11:15 PM" 
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);

    // Combine with "at" between date and time: "Apr 17, 2025 at 11:15 PM"
    return `${datePart} at ${timePart}`;
  } catch (e) {
    // If anything goes wrong, return the original string
    console.error('Error formatting date:', e);
    return dateTimeString;
  }
};

// Check if a class is currently active
const isClassActive = (startTime, endTime) => {
  if (!startTime || !endTime) return false;

  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  return now >= start && now <= end;
};

export default function ClassDetailsPage({ params }) {
  const router = useRouter();
  const classId = use(params)?.class;
  const { data: session, status } = useSession();

  const [classDetails, setClassDetails] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [isJoining, setIsJoining] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(null);

  // Check if current user is the teacher of this class
  const isTeacher = session?.user?.id === classDetails?.teacher_id;

  // Check if class is active (within start and end time)
  const classActive = classDetails ? isClassActive(classDetails.start_time, classDetails.end_time) : false;

  // Check if meeting link exists
  const hasMeetingLink = classDetails?.meeting_url && classDetails.meeting_url !== '';

  // Fetch class details and teacher info
  useEffect(() => {
    if (!classId) return;

    setLoading(true);
    setError(null);

    const fetchClassData = async () => {
      try {
        // Use session token instead of localStorage
        const authToken = session?.accessToken;

        const classData = await fetchJoinableData(
          ['classes', 'courses'],
          ['classes.course_id = courses.course_id'],
          '*',
          { 'classes.class_id': classId },
          authToken
        );

        if (classData && classData.length > 0) {
          setClassDetails(classData[0]);

          // Fetch teacher data
          const teacherData = await fetchViewData('teachers_view');
          const matchedTeacher = teacherData?.find(
            t => t.user_id === classData[0].teacher_id
          );

          if (matchedTeacher) {
            setTeacher(matchedTeacher);
          }
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

  // Fetch enrolled students
  useEffect(() => {
    if (!classId || !session) return;

    const fetchStudentData = async () => {
      try {
        // Ideally, this should be a targeted API call for students in this class
        const students = await fetchViewData('students_view'); // [{ user_id, name, ... }]
        const classes = await fetchData('classes_users');      // [{ user_id, class_id, ... }]

        // Create a map from classes data
        const classMap = new Map();
        for (const entry of classes) {
          classMap.set(entry.user_id, entry);
        }

        // Merge students with their corresponding class info
        const studentData = students.map(student => {
          const classInfo = classMap.get(student.user_id) || {};
          return {
            ...student,
            ...classInfo,
          };
        });
        const classStudents = studentData.filter(
          student => parseInt(student.class_id) === parseInt(classId)
        );
        setStudents(classStudents);
      } catch (err) {
        console.error('Error fetching student data:', err);
        // Don't show error for students list if the main data loaded
        if (!classDetails) {
          setError('Failed to load student information');
        }
      }
    };

    fetchStudentData();
  }, [classId, session, classDetails]);

  const joinClass = async () => {
    if (!session) {
      router.push('/registration/login');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch('/api/joinClass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ classId, userId: session.user.id }),
      });

      if (response.ok) {
        // Only add student to list if they're not already there
        if (!students.some(s => s.user_id === session.user.id)) {
          setStudents(prev => [...prev, {
            user_id: session.user.id,
            class_id: classId,
            user_name: session.user.name,
            user_email: session.user.email
          }]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to join class. Please try again.');
      }
    } catch (err) {
      console.error('Error joining class:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Generate or regenerate Whereby meeting link
  const generateMeetingLink = async () => {
    if (!session || !isTeacher) {
      setError('Only teachers can generate meeting links');
      return;
    }

    setIsGeneratingLink(true);
    setError(null);

    try {
      const response = await fetch('/api/createMeeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          classId,
          startDate: classDetails.start_time,
          endDate: classDetails.end_time,
          className: classDetails.course_name
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setClassDetails(prev => ({
          ...prev,
          meeting_url: data.meetingUrl
        }));
        setSuccess('Meeting link generated successfully');

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to generate meeting link. Please try again.');
      }
    } catch (err) {
      console.error('Error generating meeting link:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Join online meeting
  const joinMeeting = () => {
    if (!classDetails?.meeting_url) {
      setError('No meeting link available');
      return;
    }

    // Open meeting in new tab
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

  const isEnrolled = students.some(s => s.user_id === session?.user?.id);

  return (
    <div className={styles.container}>
      <main className={styles.mainSection}>
        <div className={styles.classCard}>
          <div className={styles.classHeader}>
            <h1 className={styles.title}>{classDetails.course_name}</h1>

            <div className={styles.buttonGroup}>
              {/* Join class button - hide for teacher */}
              {!isTeacher && (
                <button
                  className={`${styles.joinButton} ${isEnrolled ? styles.enrolled : ''}`}
                  onClick={() => {
                    if (status === 'authenticated' && !isJoining && !isEnrolled) {
                      joinClass();
                    } else if (status !== 'authenticated') {
                      router.push('/registration/login');
                    }
                  }}
                  disabled={isJoining || isEnrolled}
                >
                  {isJoining
                    ? 'Joining...'
                    : isEnrolled
                      ? 'Enrolled'
                      : status === 'authenticated'
                        ? 'Join Class'
                        : 'Login to Join'}
                </button>
              )}

              {/* Join meeting button (for enrolled students or teacher) */}
              {(isEnrolled || isTeacher) && (
                <button
                  className={`${styles.joinButton} ${styles.meetingButton}`}
                  onClick={joinMeeting}
                  disabled={!hasMeetingLink || !classActive}
                  title={
                    !hasMeetingLink
                      ? 'No meeting link available'
                      : !classActive
                        ? 'Class is not currently active'
                        : 'Join online meeting'
                  }
                >
                  Join Meeting
                </button>
              )}

              {/* Generate meeting link button (for teacher only) */}
              {isTeacher && (
                <button
                  className={`${styles.joinButton} ${styles.generateButton}`}
                  onClick={generateMeetingLink}
                  disabled={isGeneratingLink}
                >
                  {isGeneratingLink
                    ? 'Generating...'
                    : hasMeetingLink
                      ? 'Regenerate Meeting Link'
                      : 'Generate Meeting Link'}
                </button>
              )}
            </div>
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

            {/* Show meeting status */}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Meeting Status</span>
              <div className={`${styles.statusBadge} ${classActive ? styles.active : styles.inactive}`}>
                {classActive ? 'Active' : 'Inactive'}
              </div>
            </div>

            {/* Show meeting URL */}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Meeting URL</span>
              <div className={styles.meetingUrl}>
                {classDetails.meeting_url ? classDetails.meeting_url : 'No meeting URL set'}
              </div>
            </div>
          </div>

          <div className={styles.courseDescription}>
            <h3>Course Description</h3>
            <p>{classDetails.course_details}</p>
          </div>

          {/* Add Class Content Component */}
          <ClassContent classId={classId} isTeacher={isTeacher} />

          <div className={styles.studentsSection}>
            <h3>Enrolled Students ({students.length})</h3>
            {students.length > 0 ? (
              <ul className={styles.studentList}>
                {students.map((student) => (
                  <li
                    key={student.user_id}
                    className={styles.studentCard}
                  >
                    <div className={styles.studentName}>{student.user_name}</div>
                    <div className={styles.studentEmail}>{student.user_email}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>No students enrolled yet.</p>
            )}
          </div>
        </div>
      </main>

      {/* Error toast */}
      {error && (
        <div className={styles.toast}>
          <div className={styles.toastContent}>
            <span className={styles.toastMessage}>{error}</span>
            <button
              className={styles.toastClose}
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Success toast */}
      {success && (
        <div className={`${styles.toast} ${styles.successToast}`}>
          <div className={styles.toastContent}>
            <span className={styles.toastMessage}>{success}</span>
            <button
              className={styles.toastClose}
              onClick={() => setSuccess(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
