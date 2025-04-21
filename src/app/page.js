'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css';
import { fetchData } from './lib/helpers';
import './global.css';

export default function HomePage() {
  const router = useRouter();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotices() {
      try {
        const data = await fetchData("notices");
        setNotices(data);
      } catch (error) {
        console.error("Error fetching notices:", error);
      } finally {
        setLoading(false);
      }
    }

    loadNotices();
  }, []);

  // Format date for better display
  const formatDate = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className={styles.container}>
        <main className={styles.mainContent}>
          <div className={styles.leftSection}>
            <img className={styles.profileCircle} src="/logo.png" alt="logo" />
            <div className={styles.menuButtons}>
              <button onClick={() => router.push('/classes')} id={styles.course}>
                <span>
                  <img src="/course.png" alt="course_image" />{' '}
                </span>
                Courses
              </button>
              <button onClick={() => router.push('/preparation')} id={styles.preparation}>
                <span>
                  <img src="/preparation.png" alt="preparation_image" />
                </span>
                Preparation
              </button>
              <button onClick={() => router.push('/languages')} id={styles.languages}>
                <span>
                  <img src="/language.png" alt="language_image" />{' '}
                </span>
                Language Classes
              </button>
              <button onClick={() => router.push('/others')} id={styles.others}>
                <span>
                  <img src="/others.png" alt="others_image" />{' '}
                </span>
                Others
              </button>
            </div>
          </div>
        </main>
        <div className={styles.notices}>
          <h2>Notices</h2>
          {loading ? (
            <div className={styles.loadingNotices}>Loading notices...</div>
          ) : notices.length > 0 ? (
            <div className={styles.noticesList}>
              {notices.map((notice) => (
                <div key={notice.notices_id} className={styles.noticeItem}>
                  <div className={styles.noticeHeader}>
                    <div className={styles.noticeIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className={styles.noticeDateTime}>
                      {formatDate(notice.notice_date_time)}
                    </div>
                  </div>
                  <div className={styles.noticeContent}>
                    {notice.notice_content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noNotices}>No notices available</div>
          )}
        </div>
      </div>
    </>
  );
}
