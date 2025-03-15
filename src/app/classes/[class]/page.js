'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import '../../global.css';
import styles from '../../../styles/ClassDetails.module.css';
import Loading from '../../components/Loading';
import { fetchDataWhereAttrIs, fetchViewData, fetchJoinableData } from '../../lib/helpers';

export default function ClassDetailsPage({ params }) {
  const router = useRouter();
  const { class: classId } = use(params);
  const { data: session, status } = useSession();

  const [classDetails, setClassDetails] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!classId) return;
    const authToken = localStorage.getItem('authToken');

    // Fetch class details
    fetchJoinableData(
      ['classes', 'courses'],
      ['classes.course_id = courses.course_id'],
      '*',
      { 'classes.class_id': classId },
      authToken
    ).then((data) => {
      if (data && data.length > 0) {
        setClassDetails(data[0]);
        fetchViewData('teachers_view').then((teacherData) => {
          if (teacherData && teacherData.length > 0) {
            teacherData.forEach((teacher) => {
              if (teacher.user_id === data[0].teacher_id) {
                setTeacher(teacher);
              }
            });
          }
        }).catch((err) => {
          console.error('Error fetching teacher data:', err);
          setError('Failed to fetch teacher data');
        });
      }
    }).catch((err) => {
      console.error('Error fetching class details:', err);
      setError('Failed to fetch class details');
    });

  }, [classId]);

  useEffect(() => {
    if (!session) return;
    fetchViewData('students_view').then((data) => {
      let studentArray = [];
      for (let i = 0; i < data.length; i++) {
        if (data[i].user_id === session.user.id) {
          studentArray.push(data[i]);
        }
      }
      setStudents(studentArray);
    }).catch((err) => {
      console.error('Error fetching student data:', err);
      setError('Failed to fetch student data');
    });
  }, [session]);

  async function joinClass() {
    if (!session) {
      router.push('/registration/login');
      return;
    }

    setIsJoining(true);
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
        setStudents([...students, { user_id: session.user.id, class_id: classId }]);
      } else {
        console.error('Failed to join class');
        setError('Failed to join class');
      }
    } catch (err) {
      console.error('Error joining class:', err);
      setError('Failed to join class');
    }
    setIsJoining(false);
  }

  if (!classDetails) return <Loading />;

  return (
    <div className={styles.container}>
      <main className={styles.mainSection}>
        <div className={styles.classData}>
          <span>
            <h2 className={styles.header}>{classDetails.course_name}</h2>
            <span
              className={
                styles.joinIn +
                (students.some((s) => s.user_id === session?.user?.id)
                  ? ' ' + styles.disabledJoinButton
                  : '')
              }
              onClick={() => {
                if (status === 'authenticated' && !isJoining) {
                  students.some((s) => s.user_id === session?.user?.id) ? null : joinClass();
                } else {
                  router.push('/registration/login');
                }
              }}>
              {isJoining
                ? 'Please wait...'
                : students.some((s) => s.user_id === session?.user?.id)
                  ? 'Joined'
                  : status === 'authenticated'
                    ? 'Join Class'
                    : 'Login to Join Class'}
            </span>
          </span>

          <p className={styles.teacherMetaData}>
            <strong>Teacher:</strong>{' '}
            <span className={styles.teacher} onClick={() => router.push(`/profile/${teacher.user_id}`)}>{teacher ? teacher.user_name : 'Loading...'}</span>
          </p>
          <p>
            <strong>Schedule:</strong>{' '}
            <span className={styles.time}>
              {classDetails.start_time} - {classDetails.end_time}
            </span>
          </p>
          <p className={styles.courseDetails}>{classDetails.course_details}</p>
          <ul className={styles.studentList}>
            {students.length > 0 ? (
              students.map((student) => <li key={student.user_id} className={styles.student} onClick={() => router.push(`/profile/${student.user_id}`)}>
                {student.user_name}
                <span className={styles.studentEmail}>{student.user_email}</span>
              </li>)
            ) : (
              <p>No students enrolled yet.</p>
            )}
          </ul>
        </div>
      </main>
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}
