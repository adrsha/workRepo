'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import styles from '../../styles/Nav.module.css';

const USER_NAV_ITEMS = [
  { name: 'Edit profile', path: '/settings' }
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const isAuthenticated = status === 'authenticated';
  const isStudent = session?.user?.level === 0;
  const isHomePage = pathname === '/';
  const isLmsHomePage = pathname === '/lmshome';

  // Fetch notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();

      // Set up polling for new notifications (every 30 seconds)
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/getNotifs?limit=5');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        // Count unread notifications
        const unread = data.notifications.filter(notif => notif.read_status === 0).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch('/api/getNotifs', {
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
        // Update local state to mark notification as read
        setNotifications(prevNotifications =>
          prevNotifications.map(notif =>
            notif.notif_id === notificationId ? { ...notif, read_status: 1 } : notif
          )
        );
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const navigateTo = (path) => () => router.push(path);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Format notification date
  const formatNotificationDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNotificationClick = (notif) => {
    // Mark as read
    if (notif.read_status === 0) {
      markAsRead(notif.notif_id);
    }

    // Navigate if there's a link
    if (notif.link) {
      router.push(notif.link);
    }

    // Close notification panel
    setShowNotifications(false);
  };

  return (
    <nav className={styles.navbar}>
      {/* Logo section */}
      <div className={styles.logo} onClick={navigateTo('/')}>
        <img src="/logo_ref.svg" alt="MeroTuition Logo" />
      </div>

      {/* Navigation links */}
      <div className={styles.navLinks}>
        {/* Conditionally render Courses button for students */}
        {isStudent && !isHomePage && (
          <button className={styles.navButton} onClick={navigateTo('/classes')}>Courses</button>
        )}

        {/* Common navigation links */}
        <button className={styles.navButton} onClick={navigateTo('/aboutus')}>About Us</button>
        <button className={styles.navButton} onClick={navigateTo('/contactus')}>Contact Us</button>

        {/* Authenticated user section */}
        {isAuthenticated ? (
          <>
            {!isLmsHomePage && (
              <button className={styles.navButton} onClick={navigateTo('/lmshome')}>Home</button>
            )}

            {/* Notifications */}
            <div className={styles.notificationContainer} ref={notificationRef}>
              <button
                className={styles.notificationButton}
                onClick={toggleNotifications}
                aria-label="Notifications"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor" />
                </svg>
                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className={styles.notificationsDropdown}>
                  <div className={styles.notificationHeader}>
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                      <span>{unreadCount} unread</span>
                    )}
                  </div>

                  {notifications.length > 0 ? (
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
                    </ul>
                  ) : (
                    <p className={styles.noNotifications}>No notifications</p>
                  )}

                  <div className={styles.notificationFooter}>
                    <button onClick={navigateTo('/notifications')}>
                      See all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User dropdown menu */}
            <span className={styles.dropdown}>
              <a
                className={styles.dropdownUname}
                onClick={navigateTo(`/profile/${session?.user?.id}`)}
              >
                {session?.user?.name}
              </a>

              <ul>
                {USER_NAV_ITEMS.map(({ name, path }) => (
                  <a key={name} onClick={navigateTo(path)}>
                    <li>{name}</li>
                  </a>
                ))}

                <a onClick={() => {
                  signOut();
                  router.push('/');
                }}>
                  <li>Sign Out</li>
                </a>
              </ul>
            </span>
          </>
        ) : (
          /* Non-authenticated user options */
          <>
            <button className={styles.navButton} onClick={navigateTo('/registration/signup')}>
              Sign Up
            </button>
            <button
              className={styles.specialNavButton}
              onClick={navigateTo('/registration/login')}
            >
              Login
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
