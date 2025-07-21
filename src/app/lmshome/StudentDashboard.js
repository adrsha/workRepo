import Loading from '../components/Loading.js';
import styles from '../../styles/Studentlms.module.css';

const StudentDashboard = ({ userData, router}) => {
    const { classesData } = userData;

    const renderClassCard = (classData) => (
        <div className={styles.classCard} key={classData.class_id}>
            <div className={styles.classCardContent}>
                <h3 className={styles.classTitle}>
                    {capitalizeFirstLetter(classData.course_name)} ({classData.grade_name})
                </h3>
                <p className={styles.teacherName}>Teacher: {classData.teacher_name}</p>
                <p className={styles.courseDetails}>{classData.course_details}</p>
            </div>
            <div className={styles.classActions}>
                <button
                    className={styles.primaryButton}
                    onClick={() => navigateToClass(classData.class_id)}>
                    Study
                </button>
            </div>
        </div>
    );

    const capitalizeFirstLetter = (str) => {
        return str[0].toUpperCase() + str.slice(1);
    };

    const navigateToClass = (classId) => {
        router.push(`/classes/${classId}`);
    };

    const renderEmptyState = () => (
        <div className={styles.emptyState}>
            <p>No classes found</p>
            <p>Head to <a href="/classes"><i><strong>Classes</strong></i></a> to join a class</p>
        </div>
    );

    const renderClassesList = () => {
        if (classesData.length === 0) {
            return renderEmptyState();
        }

        return (
            <div className={styles.classCards}>
                {classesData.map(renderClassCard)}
            </div>
        );
    };

    if (!classesData) {
        return <Loading />;
    }

    return (
        <div className={styles.content}>
            <h2 className={styles.sectionTitle}>Your Classes</h2>
            {renderClassesList()}
        </div>
    );
};

export default StudentDashboard;
