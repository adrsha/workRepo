import styles from '../../styles/ClassDetails.module.css';

export const StudentsList = ({ students }) => (
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
