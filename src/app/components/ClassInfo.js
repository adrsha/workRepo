import styles from '../../styles/ClassDetails.module.css';
import { formatDateTime, getDate } from '../../utils/dateTime';
import { 
    getMeetingStatus, 
    getStatusText, 
    formatRecurrence 
} from '../../utils/classStatus';

const getStatusClass = (status) => {
    switch (status) {
        case 'active': return styles.active;
        case 'inactive': return styles.inactive;
        default: return styles.scheduled;
    }
};

export const ClassInfo = ({ classDetails, teacher, router }) => {
    const repeatPattern = classDetails?.repeat_every_n_day || classDetails?.['repeat-n-days'];
    const correctedStartTime = `${getDate(classDetails.start_time).yyyymmdd}T${getDate(classDetails.start_time).hhmmss}`;
    const correctedEndTime = `${getDate(classDetails.end_time).yyyymmdd}T${getDate(classDetails.end_time).hhmmss}`;
    const status = getMeetingStatus(correctedStartTime, correctedEndTime, repeatPattern);

    return (
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

            {repeatPattern && (
                <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Recurrence</span>
                    <div className={styles.scheduleBadge}>
                        {formatRecurrence(repeatPattern)}
                    </div>
                </div>
            )}

            <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Meeting Status</span>
                <div className={`${styles.statusBadge} ${getStatusClass(status)}`}>
                    {getStatusText(status)}
                </div>
            </div>
        </div>
    );
};
