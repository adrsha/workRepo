import styles from '../../../styles/NoticeList.module.css';

export const NoticeList = ({ notices, isAdmin, onDelete }) => {

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.noticesList}>
            {
                Array.from(notices).map((notice) => (
                    <div className={styles.noticeContainer} key={notice.notices_id}>
                        <a className={styles.noticeLink} href={`/notices/${notice.notices_id}`}>
                            <div className={styles.noticeCard}>
                                <div className={styles.noticeHeader}>
                                    <h3 className={styles.noticeTitle}>
                                        {notice.notices_title}
                                    </h3>
                                    <div className={styles.noticeActions}>
                                        <span className={styles.noticeDate}>
                                            {formatDate(notice.notices_date_time)}
                                        </span>
                                    </div>
                                </div>

                            </div>
                        </a>
                        {isAdmin && (
                            <button
                                className={styles.deleteButton}
                                onClick={() => onDelete(notice.notices_id)}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                ))
            }

        </div >
    );
};
