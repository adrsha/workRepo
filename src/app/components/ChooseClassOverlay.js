'use client';

import { useRouter } from 'next/navigation';
import styles from '../../styles/GradesChoice.module.css';
import { formatRepeatPattern } from '../lib/utils';
import { getDateLocalFromUTC } from '../lib/helpers';

export default function ClassroomOverlay({
    selectedCourse,
    onClose,
    getTeacher,
    renderClassActionButton
}) {
    const router = useRouter();

    if (!selectedCourse) return null;

    return (
        <div className={styles.fullScreenOverlay}>
            <div className={styles.overlayContent}>
                <div className={styles.overlayHeader}>
                    <div className={styles.headerContent}>
                        <h2 className={styles.overlayTitle}>Selected Classes</h2>
                        <span className={styles.subtitle}>Available Classrooms</span>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <span>Exit to add other classes to cart</span>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className={styles.overlayBody}>
                    <div className={styles.classroomGrid}>
                        {selectedCourse.classes.map(classItem => {
                            const teacher = getTeacher(classItem.teacher_id);
                            const startDate = getDateLocalFromUTC(classItem.start_time);
                            const endDate = getDateLocalFromUTC(classItem.end_time);

                            return (
                                <div key={classItem.class_id} className={styles.classroomCard}>
                                    {/* Teacher Section */}
                                    <div className={styles.teacherSection}>
                                        <div className={styles.teacherInfo}>
                                            <div className={styles.teacherAvatar}>
                                                {teacher?.user_name?.charAt(0) || 'T'}
                                            </div>
                                            <div className={styles.teacherDetails}>
                                                <h3 className={styles.teacherName}>
                                                    {teacher?.user_name || 'Teacher'}
                                                </h3>
                                                <span className={styles.teacherRole}>Instructor</span>
                                            </div>
                                        </div>
                                        <button
                                            className={styles.profileButton}
                                            onClick={() => router.push(`/profile/${classItem.teacher_id}`)}
                                        >
                                            View Profile
                                        </button>
                                    </div>

                                    {/* Schedule Section */}
                                    <div className={styles.scheduleSection}>
                                        <div className={styles.scheduleGrid}>
                                            <div className={styles.scheduleItem}>
                                                <div className={styles.scheduleLabel}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    Duration
                                                </div>
                                                <div className={styles.scheduleValue}>
                                                    <span className={styles.dateChip}>
                                                        {startDate.yyyymmdd}
                                                    </span>
                                                    <span className={styles.dateSeparator}>to</span>
                                                    <span className={styles.dateChip}>
                                                        {endDate.yyyymmdd}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={styles.scheduleItem}>
                                                <div className={styles.scheduleLabel}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12,6 12,12 16,14" />
                                                    </svg>
                                                    Time
                                                </div>
                                                <div className={styles.scheduleValue}>
                                                    <span className={styles.timeChip}>
                                                        {startDate.hhmmss}
                                                    </span>
                                                    <span className={styles.timeSeparator}>–</span>
                                                    <span className={styles.timeChip}>
                                                        {endDate.hhmmss}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={styles.scheduleItem}>
                                                <div className={styles.scheduleLabel}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                        <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                    Repeats
                                                </div>
                                                <div className={styles.scheduleValue}>
                                                    <span className={styles.repeatChip}>
                                                        {formatRepeatPattern(classItem.repeat_every_n_day)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={styles.scheduleItem}>
                                                <div className={styles.scheduleLabel}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <text x="12" y="16" textAnchor="middle" fontFamily="serif" fontSize="19" fill="currentColor" stroke="none">रू</text>
                                                    </svg>
                                                    Cost
                                                </div>
                                                <div className={styles.scheduleValue}>
                                                    <span className={styles.costChip}>
                                                        {classItem.cost}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.classDesc}>
                                        {classItem.class_description}
                                    </div>

                                    <div className={styles.actionSection}>
                                        {renderClassActionButton(classItem)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
