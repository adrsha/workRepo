'use client';
import "../global.css";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Notifications.module.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'read', 'unread'
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const router = useRouter();
  const { data: session, status } = useSession();

  const ITEMS_PER_PAGE = 15;

  // Check if user is authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/registration/login');
    }
  }, [status, router]);

  // Fetch notifications
  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications();
    }
  }, [page, filter, status]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Build the query parameters
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
      });

      if (filter === 'read') {
        params.append('status', '1');
      } else if (filter === 'unread') {
        params.append('status', '0');
      }

      const response = await fetch(`/api/getNotifs?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();

      // Track if we have more pages
      setHasMore(data.notifications.length === ITEMS_PER_PAGE);

      // Count total unread
      const countResponse = await fetch('/api/notifications/count');
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setTotalUnread(countData.unreadCount);
      }

      if (page === 0) {
        setNotifications(data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action: 'mark-read'
        }),
      });

      if (response.ok) {
        // Update local state
        setNotifications(prevNotifications =>
          prevNotifications.map(notif =>
            notif.notif_id === notificationId ? { ...notif, read_status: 1 } : notif
          )
        );

        // Update total unread count
        setTotalUnread(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/markallread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Update local state
        setNotifications(prevNotifications =>
          prevNotifications.map(notif => ({ ...notif, read_status: 1 }))
        );

        // Update total unread count
        setTotalUnread(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notif) => {
    // Mark as read if unread
    if (notif.read_status === 0) {
      markAsRead(notif.notif_id);
    }

    // Navigate if there's a link
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const formatNotificationDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const loadMore = () => {
    setPage(prevPage => prevPage + 1);
  };

  const changeFilter = (newFilter) => {
    setFilter(newFilter);
    setPage(0); // Reset to first page when changing filters
    setNotifications([]); // Clear notifications when changing filters
  };

  // If not authenticated, return null (will redirect)
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Notifications</h1>
        <div className={styles.actions}>
          {totalUnread > 0 && (
            <button
              className={styles.markAllReadBtn}
              onClick={markAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className={styles.filterBar}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => changeFilter('all')}
        >
          All
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'unread' ? styles.active : ''}`}
          onClick={() => changeFilter('unread')}
        >
          Unread {totalUnread > 0 && `(${totalUnread})`}
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'read' ? styles.active : ''}`}
          onClick={() => changeFilter('read')}
        >
          Read
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          Error loading notifications: {error}
        </div>
      )}

      {!error && notifications.length === 0 && !loading ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor" />
            </svg>
          </div>
          <p>No notifications to display</p>
        </div>
      ) : (
        <ul className={styles.notificationsList}>
          {notifications.map((notif) => (
            <li
              key={notif.notif_id}
              className={`${styles.notificationItem} ${notif.read_status === 0 ? styles.unread : ''}`}
              onClick={() => handleNotificationClick(notif)}
            >
              <div className={styles.notificationContent}>
                <p className={styles.notificationMessage}>{notif.message}</p>
                <span className={styles.notificationTime}>
                  {formatNotificationDate(notif.created_at)}
                </span>
              </div>
            </li>
          ))}

          {loading && (
            <div className={styles.loadingState}>
              <div className={styles.loader}></div>
              <p>Loading notifications...</p>
            </div>
          )}

          {!loading && hasMore && (
            <button
              className={styles.loadMoreBtn}
              onClick={loadMore}
            >
              Load more
            </button>
          )}
        </ul>
      )}
    </div>
  );
}
