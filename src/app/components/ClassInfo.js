import styles from '../../styles/ClassDetails.module.css';
import { formatDateTime, isClassJoinable, isClassInPast, isValidClassDay } from '../../utils/dateTime';

export const ClassInfo = ({ classDetails, teacher, router }) => {
    const repeatNDays = classDetails.repeat_every_n_day || classDetails['repeat-n-days'];
    const isValidDay = isValidClassDay(classDetails.start_time, repeatNDays);
    
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

            {repeatNDays && (
                <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Recurrence</span>
                    <div className={styles.scheduleBadge}>
                        Every {repeatNDays} day{repeatNDays !== 1 ? 's' : ''}
                    </div>
                </div>
            )}

            <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Meeting Status</span>
                <div className={`${styles.statusBadge} ${
                    isClassJoinable(classDetails.start_time, classDetails.end_time, repeatNDays)
                        ? styles.active 
                        : isClassInPast(classDetails.end_time) && (!repeatNDays || (repeatNDays && !isValidDay))
                            ? styles.inactive 
                            : styles.scheduled
                }`}>
                    {isClassJoinable(classDetails.start_time, classDetails.end_time, repeatNDays)
                        ? 'Active' 
                        : isClassInPast(classDetails.end_time) && (!repeatNDays || (repeatNDays && !isValidDay))
                            ? 'Ended' 
                            : repeatNDays && !isValidDay
                                ? 'Not Today'
                                : 'Scheduled'
                    }
                </div>
            </div>
        </div>
    );
};
