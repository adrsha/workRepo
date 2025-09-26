import styles from '../../../styles/NoticeList.module.css';
import { useState, useEffect } from 'react';

export const NoticeList = ({ notices, isAdmin, onDelete }) => {
    const [viewedNotices, setViewedNotices] = useState(new Set());

    // Cookie helpers
    const getCookie = (name) => {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    const setCookie = (name, value, days = 30) => {
        if (typeof document === 'undefined') return;
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    };

    const loadViewedNotices = () => {
        const cookieValue = getCookie('viewedNotices');
        if (cookieValue) {
            try {
                const parsed = JSON.parse(decodeURIComponent(cookieValue));
                return new Set(parsed);
            } catch (e) {
                console.warn('Failed to parse viewed notices cookie:', e);
                return new Set();
            }
        }
        return new Set();
    };

    const saveViewedNotices = (viewedSet) => {
        try {
            const serialized = JSON.stringify(Array.from(viewedSet));
            setCookie('viewedNotices', encodeURIComponent(serialized));
        } catch (e) {
            console.warn('Failed to save viewed notices cookie:', e);
        }
    };

    // Load viewed notices from cookie on mount
    useEffect(() => {
        const viewed = loadViewedNotices();
        setViewedNotices(viewed);
    }, []);

    // Save to cookie when viewedNotices changes
    useEffect(() => {
        if (viewedNotices.size > 0) {
            saveViewedNotices(viewedNotices);
        }
    }, [viewedNotices]);

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

    const handleNoticeClick = (noticeId) => {
        setViewedNotices(prev => {
            const newSet = new Set(prev);
            newSet.add(noticeId);
            return newSet;
        });
    };

    const isNoticeNew = (noticeId) => {
        return !viewedNotices.has(noticeId);
    };

    // Sort notices by date (newest first)
    const sortedNotices = Array.from(notices).sort((a, b) => {
        const dateA = new Date(a.notice_date_time);
        const dateB = new Date(b.notice_date_time);
        return dateB - dateA; // Newest first
    });

    return (
        <div className={styles.noticesList}>
            {
                sortedNotices.map((notice) => (
                    <div className={styles.noticeContainer} key={notice.notice_id}>
                        <a 
                            className={styles.noticeLink} 
                            href={`/notices/${notice.notice_id}`}
                            onClick={() => handleNoticeClick(notice.notice_id)}
                        >
                            <div className={`${styles.noticeCard} ${isNoticeNew(notice.notice_id) ? styles.newNotice : ''}`}>
                                <div className={styles.noticeHeader}>
                                    <h3 className={styles.noticeTitle}>
                                        {notice.notice_title}
                                        {isNoticeNew(notice.notice_id) && (
                                            <span className={styles.newBadge}>NEW</span>
                                        )}
                                    </h3>
                                    <div className={styles.noticeActions}>
                                        <span className={styles.noticeDate}>
                                            {formatDate(notice.notice_date_time)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </a>
                        {isAdmin && (
                            <button
                                className={styles.deleteButton}
                                onClick={() => onDelete(notice.notice_id)}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                ))
            }
        </div>
    );
};
