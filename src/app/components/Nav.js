'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import styles from '../../styles/Nav.module.css';

// Constants
const USER_NAV_ITEMS = [
    { name: 'Edit profile', path: '/settings' }
];

const UNAUTHENTICATED_NAV_ITEMS = [
    { name: 'Classes', path: '/classes' },
    { name: 'Preparation', path: '#' },
    { name: 'Language Classes', path: '#' },
    { name: 'Other Classes', path: '/registration/other-classes' },
    { name: 'Downloads', path: '/downloads' },
];

// API utilities
const fetchNotifications = async () => {
    const response = await fetch('/api/getNotifs?limit=5');
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
};

const markNotificationRead = async (notificationId) => {
    const response = await fetch('/api/getNotifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, action: 'mark-read' })
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
};

// Hooks
const useNotifications = (isAuthenticated) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    const refreshNotifications = async () => {
        try {
            const data = await fetchNotifications();
            setNotifications(data.notifications);
            setUnreadCount(data.notifications.filter(n => n.read_status === 0).length);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await markNotificationRead(notificationId);
            setNotifications(prev =>
                prev.map(notif =>
                    notif.notif_id === notificationId ? { ...notif, read_status: 1 } : notif
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        refreshNotifications();
        const interval = setInterval(refreshNotifications, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    return { notifications, unreadCount, showNotifications, setShowNotifications, markAsRead };
};

const useClickOutside = (ref, callback) => {
    useEffect(() => {
        const handleClick = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [ref, callback]);
};

// Utilities
const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

// Components
const Logo = ({ onNavigate }) => (
    <div className={styles.logo} onClick={onNavigate('/')}>
        <img src="/logo.png" alt="MeroTuition Logo" />
    </div>
);

const HamburgerButton = ({ isOpen, onToggle }) => (
    <button
        className={`${styles.hamburgerButton} ${isOpen ? styles.active : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label="Toggle navigation menu"
    >
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
    </button>
);

const NotificationBell = ({ unreadCount, onToggle }) => (
    <button className={styles.notificationButton} onClick={onToggle} aria-label="Notifications">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor" />
        </svg>
        {unreadCount > 0 && (
            <span className={styles.notificationBadge}>{unreadCount}</span>
        )}
    </button>
);

const NotificationItem = ({ notification, onNavigate, onMarkRead }) => {
    const handleClick = () => {
        if (notification.read_status === 0) {
            onMarkRead(notification.notif_id);
        }
        if (notification.link) {
            onNavigate(notification.link)();
        }
    };

    return (
        <li
            className={`${styles.notificationItem} ${notification.read_status === 0 ? styles.unread : ''}`}
            onClick={handleClick}
        >
            <div className={styles.notificationContent}>
                <p className={styles.notificationMessage}>{notification.message}</p>
                <span className={styles.notificationTime}>
                    {formatDate(notification.created_at)}
                </span>
            </div>
        </li>
    );
};

const NotificationsDropdown = ({ notifications, unreadCount, onNavigate, onMarkRead, onClose }) => (
    <div className={styles.notificationsDropdown}>
        <div className={styles.notificationHeader}>
            <h3>Notifications</h3>
            {unreadCount > 0 && <span>{unreadCount} unread</span>}
        </div>

        {notifications.length > 0 ? (
            <ul className={styles.notificationsList}>
                {notifications.map(notif => (
                    <NotificationItem
                        key={notif.notif_id}
                        notification={notif}
                        onNavigate={onNavigate}
                        onMarkRead={onMarkRead}
                    />
                ))}
            </ul>
        ) : (
            <p className={styles.noNotifications}>No notifications</p>
        )}

        <div className={styles.notificationFooter}>
            <button onClick={() => { onNavigate('/notifications')(); onClose(); }}>
                See all notifications
            </button>
        </div>
    </div>
);

const UserDropdown = ({ session, onNavigate, onSignOut, classname }) => (
    <span className={`${styles.dropdown} ${classname}`} >
        <a
            className={styles.dropdownUname}
            onClick={onNavigate(`/profile/${session?.user?.id}`)}
        >
            {session?.user?.name}
        </a>
        <ul>
            {USER_NAV_ITEMS.map(({ name, path }) => (
                <a key={name} onClick={onNavigate(path)}>
                    <li>{name}</li>
                </a>
            ))}
            <a onClick={onSignOut}>
                <li>Sign Out</li>
            </a>
        </ul>
    </span>
);

const NavButton = ({ children, onClick, className = styles.navButton }) => (
    <button className={className} onClick={onClick}>
        {children}
    </button>
);

const AuthenticatedNav = ({
    isStudent,
    isHomePage,
    isLmsHomePage,
    session,
    onNavigate,
    onSignOut,
    notificationProps,
    notificationRef
}) => (
    <>
        {isStudent && !isHomePage && (
            <NavButton onClick={onNavigate('/classes')}>Courses</NavButton>
        )}

        <NavButton onClick={onNavigate('/classes')}>Classes</NavButton>
        <NavButton onClick={onNavigate('/preparation')}>Preparation</NavButton>
        <NavButton onClick={onNavigate('/language-classes')}>Language Classes</NavButton>
        <NavButton onClick={onNavigate('/other-classes')}>Other Classes</NavButton>
        <NavButton onClick={onNavigate('/downloads')}>Downloads</NavButton>

        {!isLmsHomePage && (
            <NavButton onClick={onNavigate('/lmshome')}>Dashboard</NavButton>
        )}
    </>
);

const UnauthenticatedNav = ({ onNavigate }) => (
    <>
        {UNAUTHENTICATED_NAV_ITEMS.map(({ name, path }) => (
            <NavButton key={name} onClick={onNavigate(path)}>
                {name}
            </NavButton>
        ))}
        <NavButton
            onClick={onNavigate('/registration/login')}
        >
            Log In
        </NavButton>
        <NavButton
            className={styles.specialNavButton}
            onClick={onNavigate('/registration/signup')}
        >
            Sign Up
        </NavButton>
    </>
);

const NavLinks = ({
    isAuthenticated,
    isStudent,
    isHomePage,
    isLmsHomePage,
    session,
    menuOpen,
    onNavigate,
    onSignOut,
    notificationProps,
    notificationRef
}) => (
    <div className={`${styles.navLinks} ${menuOpen ? styles.showMobileMenu : ''}`}>
        <NavButton onClick={onNavigate('/')}>Home</NavButton>
        <NavButton onClick={onNavigate('/aboutus')}>About Us</NavButton>
        <NavButton onClick={onNavigate('/contactus')}>Contact Us</NavButton>

        {isAuthenticated ? (
            <AuthenticatedNav
                isStudent={isStudent}
                isHomePage={isHomePage}
                isLmsHomePage={isLmsHomePage}
                session={session}
                onNavigate={onNavigate}
                onSignOut={onSignOut}
                notificationProps={notificationProps}
                notificationRef={notificationRef}
            />
        ) : (
            <UnauthenticatedNav onNavigate={onNavigate} />
        )}
    </div>
);

// Main Component
export default function Nav() {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);

    const notificationRef = useRef(null);
    const hamburgerRef = useRef(null);

    const isAuthenticated = status === 'authenticated';
    const isStudent = session?.user?.level === 0;
    const isHomePage = pathname === '/';
    const isLmsHomePage = pathname === '/lmshome';

    const notificationProps = useNotifications(isAuthenticated);

    const navigateTo = (path) => () => {
        router.push(path);
        setMenuOpen(false);
    };

    const handleSignOut = () => {
        signOut();
        // router.push('/');
        setMenuOpen(false);
    };

    const closeMenus = () => {
        setMenuOpen(false);
        notificationProps.setShowNotifications(false);
    };

    useClickOutside(notificationRef, () => notificationProps.setShowNotifications(false));
    useClickOutside(hamburgerRef, () => setMenuOpen(false));

    return (
        <nav className={styles.navbar}>
            <Logo onNavigate={navigateTo} />

            <div className={styles.hamburgerContainer} ref={hamburgerRef}>
                <NavLinks
                    isAuthenticated={isAuthenticated}
                    isStudent={isStudent}
                    isHomePage={isHomePage}
                    isLmsHomePage={isLmsHomePage}
                    session={session}
                    menuOpen={menuOpen}
                    onNavigate={navigateTo}
                    onSignOut={handleSignOut}
                    notificationProps={notificationProps}
                    notificationRef={notificationRef}
                />
                {isAuthenticated &&
                <div className={`${styles.notificationContainer} ${styles.fixedNavItem}`} ref={notificationRef}>
                    <NotificationBell
                        unreadCount={notificationProps.unreadCount}
                        onToggle={() => notificationProps.setShowNotifications(!notificationProps.showNotifications)}
                    />
                    {notificationProps.showNotifications && (
                        <NotificationsDropdown
                            notifications={notificationProps.notifications}
                            unreadCount={notificationProps.unreadCount}
                            onNavigate={navigateTo}
                            onMarkRead={notificationProps.markAsRead}
                            onClose={() => notificationProps.setShowNotifications(false)}
                        />
                    )}
                </div>
                }

                {isAuthenticated &&
                    <UserDropdown session={session} onNavigate={navigateTo} onSignOut={handleSignOut} classname={styles.fixedNavItem} />
                }
                <HamburgerButton
                    isOpen={menuOpen}
                    onToggle={() => setMenuOpen(!menuOpen)}
                />
            </div>
        </nav>
    );
}
