'use client';
import "../global.css";
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Notifications.module.css';

const ITEMS_PER_PAGE = 15;
const FILTER_TYPES = {
  ALL: 'all',
  READ: 'read',
  UNREAD: 'unread'
};

// Utility function to build API query parameters
const buildNotificationParams = (page, filter) => {
  const params = new URLSearchParams({
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
  });

  // API now supports read_status parameter with values: 'read', 'unread', or omitted for 'all'
  if (filter === FILTER_TYPES.READ) {
    params.append('read_status', 'read');
  } else if (filter === FILTER_TYPES.UNREAD) {
    params.append('read_status', 'unread');
  }
  // If filter === 'all', no read_status parameter is added

  return params;
};

// Utility function to format notification dates
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

// Custom hook for authentication check
const useAuthCheck = () => {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/registration/login');
    }
  }, [status, router]);

  return status;
};

// Custom hook for notifications data management
const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(FILTER_TYPES.ALL);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/count');
      if (response.ok) {
        const data = await response.json();
        setTotalUnread(data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async (currentPage, currentFilter, isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = buildNotificationParams(currentPage, currentFilter);
      const apiUrl = `/api/getNotifs?${params}`;
      
      // DEBUG: Log the API call details
      console.log('🔍 API Call Debug:', {
        filter: currentFilter,
        page: currentPage,
        url: apiUrl,
        params: Object.fromEntries(params)
      });

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      
      // DEBUG: Log the response data
      console.log('📦 API Response Debug:', {
        filter: currentFilter,
        totalReceived: data.notifications?.length || 0,
        readCount: data.notifications?.filter(n => n.read_status === 1).length || 0,
        unreadCount: data.notifications?.filter(n => n.read_status === 0).length || 0,
      });

      // API now handles all filtering server-side
      setHasMore(data.notifications.length === ITEMS_PER_PAGE);

      if (isLoadMore) {
        setNotifications(prev => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }

      // Fetch unread count
      await fetchUnreadCount();
    } catch (err) {
      setError(err.message);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchUnreadCount]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          action: 'mark-read'
        }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.notif_id === notificationId 
              ? { ...notif, read_status: 1 } 
              : notif
          )
        );
        setTotalUnread(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/markallread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read_status: 1 }))
        );
        setTotalUnread(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Change filter and reset pagination
  const changeFilter = useCallback((newFilter) => {
    setFilter(newFilter);
    setPage(0);
    setNotifications([]);
    setHasMore(true);
  }, []);

  // Load more notifications
  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  return {
    notifications,
    loading,
    error,
    filter,
    page,
    hasMore,
    totalUnread,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    changeFilter,
    loadMore
  };
};

// Filter buttons component
const FilterButtons = ({ filter, totalUnread, onFilterChange }) => (
  <div className={styles.filterBar}>
    <button
      className={`${styles.filterBtn} ${filter === FILTER_TYPES.ALL ? styles.active : ''}`}
      onClick={() => onFilterChange(FILTER_TYPES.ALL)}
    >
      All
    </button>
    <button
      className={`${styles.filterBtn} ${filter === FILTER_TYPES.UNREAD ? styles.active : ''}`}
      onClick={() => onFilterChange(FILTER_TYPES.UNREAD)}
    >
      Unread {totalUnread > 0 && `(${totalUnread})`}
    </button>
    <button
      className={`${styles.filterBtn} ${filter === FILTER_TYPES.READ ? styles.active : ''}`}
      onClick={() => onFilterChange(FILTER_TYPES.READ)}
    >
      Read
    </button>
  </div>
);

// Notification item component
const NotificationItem = ({ notification, onNotificationClick }) => (
  <li
    className={`${styles.notificationItem} ${notification.read_status === 0 ? styles.unread : ''}`}
    onClick={() => onNotificationClick(notification)}
  >
    <div className={styles.notificationContent}>
      <p className={styles.notificationMessage}>{notification.message}</p>
      <span className={styles.notificationTime}>
        {formatNotificationDate(notification.created_at)}
      </span>
    </div>
  </li>
);

// Empty state component
const EmptyState = () => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor" />
      </svg>
    </div>
    <p>No notifications to display</p>
  </div>
);

// Loading state component
const LoadingState = () => (
  <div className={styles.loadingState}>
    <div className={styles.loader}></div>
    <p>Loading notifications...</p>
  </div>
);

// Main component
export default function NotificationsPage() {
  const router = useRouter();
  const authStatus = useAuthCheck();
  const {
    notifications,
    loading,
    error,
    filter,
    page,
    hasMore,
    totalUnread,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    changeFilter,
    loadMore
  } = useNotifications();

  // Fetch notifications when dependencies change
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchNotifications(page, filter, page > 0);
    }
  }, [page, filter, authStatus, fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = useCallback((notif) => {
    if (notif.read_status === 0) {
      markAsRead(notif.notif_id);
    }

    if (notif.link) {
      router.push(notif.link);
    }
  }, [markAsRead, router]);

  if (authStatus === 'unauthenticated') {
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

      <FilterButtons 
        filter={filter} 
        totalUnread={totalUnread} 
        onFilterChange={changeFilter} 
      />

      {error && (
        <div className={styles.error}>
          Error loading notifications: {error}
        </div>
      )}

      {!error && notifications.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <ul className={styles.notificationsList}>
          {notifications.map((notif) => (
            <NotificationItem
              key={notif.notif_id}
              notification={notif}
              onNotificationClick={handleNotificationClick}
            />
          ))}

          {loading && <LoadingState />}

          {!loading && hasMore && (
            <button className={styles.loadMoreBtn} onClick={loadMore}>
              Load more
            </button>
          )}
        </ul>
      )}
    </div>
  );
}
