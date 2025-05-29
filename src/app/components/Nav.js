'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import styles from '../../styles/Nav.module.css';

const USER_NAV_ITEMS = [
    { name: 'Edit profile', path: '/settings' }
];

// Custom hooks for separation of concerns
const useNotifications = (isAuthenticated) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/getNotifs?limit=5');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications);
                setUnreadCount(data.notifications.filter(n => n.read_status === 0).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch('/api/getNotifs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId, action: 'mark-read' }),
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(notif =>
                        notif.notif_id === notificationId ? { ...notif, read_status: 1 } : notif
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    return {
        notifications,
        unreadCount,
        showNotifications,
        setShowNotifications,
        markAsRead
    };
};

const useClickOutside = (refs, callbacks) => {
    useEffect(() => {
        const handleClickOutside = (event) => {
            refs.forEach((ref, index) => {
                if (ref.current && !ref.current.contains(event.target)) {
                    callbacks[index]();
                }
            });
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [refs, callbacks]);
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Component: Logo
const Logo = ({ onNavigate }) => (
    <div className={styles.logo} onClick={onNavigate('/')}>
        <img src="/logo.png" alt="MeroTuition Logo" />
    </div>
);

// Component: Hamburger Button
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

// Component: Notification Bell
const NotificationBell = ({ unreadCount, onToggle }) => (
    <button className={styles.notificationButton} onClick={onToggle} aria-label="Notifications">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor" />
        </svg>
        {unreadCount > 0 && (
            <span className={styles.notificationBadge}>{unreadCount}</span>
        )}
    </button>
);

// Component: Notification Item
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

// Component: Notifications Dropdown
const NotificationsDropdown = ({ notifications, unreadCount, onNavigate, onMarkRead, onClose }) => (
    <div className={styles.notificationsDropdown}>
        <div className={styles.notificationHeader}>
            <h3>Notifications</h3>
            {unreadCount > 0 && <span>{unreadCount} unread</span>}
        </div>

        {notifications.length > 0 ? (
            <ul className={styles.notificationsList}>
                {notifications.map((notif) => (
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

// Component: User Dropdown
const UserDropdown = ({ session, onNavigate, onSignOut }) => (
    <span className={styles.dropdown}>
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

// Component: Navigation Links
const NavLinks = ({ 
    isStudent, 
    isHomePage, 
    isLmsHomePage, 
    isAuthenticated, 
    session,
    menuOpen, 
    onNavigate,
    onSignOut,
    notificationProps,
    notificationRef
}) => (
    <div className={`${styles.navLinks} ${menuOpen ? styles.showMobileMenu : ''}`}>
        {isStudent && !isHomePage && (
            <button className={styles.navButton} onClick={onNavigate('/classes')}>
                Courses
            </button>
        )}

        <button className={styles.navButton} onClick={onNavigate('/')}>Home</button>
        <button className={styles.navButton} onClick={onNavigate('/aboutus')}>About Us</button>
        <button className={styles.navButton} onClick={onNavigate('/contactus')}>Contact Us</button>

        {isAuthenticated ? (
            <>
                {!isLmsHomePage && (
                    <button className={styles.navButton} onClick={onNavigate('/lmshome')}>
                        Dashboard
                    </button>
                )}

                <div className={styles.notificationContainer} ref={notificationRef}>
                    <NotificationBell
                        unreadCount={notificationProps.unreadCount}
                        onToggle={() => notificationProps.setShowNotifications(!notificationProps.showNotifications)}
                    />

                    {notificationProps.showNotifications && (
                        <NotificationsDropdown
                            notifications={notificationProps.notifications}
                            unreadCount={notificationProps.unreadCount}
                            onNavigate={onNavigate}
                            onMarkRead={notificationProps.markAsRead}
                            onClose={() => notificationProps.setShowNotifications(false)}
                        />
                    )}
                </div>

                <UserDropdown
                    session={session}
                    onNavigate={onNavigate}
                    onSignOut={onSignOut}
                />
            </>
        ) : (
            <>
                <button className={styles.navButton} onClick={onNavigate('/registration/login')}>
                    Classes
                </button>
                <button className={styles.navButton} onClick={onNavigate('/registration/login')}>
                    Preparation
                </button>
                <button className={styles.navButton} onClick={onNavigate('/registration/login')}>
                    Language Classes
                </button>
                <button className={styles.navButton} onClick={onNavigate('/registration/login')}>
                    Other Classes
                </button>
                <button className={styles.navButton} onClick={onNavigate('/registration/login')}>
                    Downloads
                </button>
                <button className={styles.navButton} onClick={onNavigate('/registration/login')}>
                    Login
                </button>
                <button className={styles.specialNavButton} onClick={onNavigate('/registration/signup')}>
                    Sign Up
                </button>
            </>
        )}
    </div>
);

// Main Nav Component
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
        router.push('/');
        setMenuOpen(false);
    };

    useClickOutside(
        [notificationRef, hamburgerRef],
        [
            () => notificationProps.setShowNotifications(false),
            () => setMenuOpen(false)
        ]
    );

    return (
        <nav className={styles.navbar}>
            <Logo onNavigate={navigateTo} />
            
            <div className={styles.hamburgerContainer} ref={hamburgerRef}>
                <HamburgerButton 
                    isOpen={menuOpen} 
                    onToggle={() => setMenuOpen(!menuOpen)} 
                />
                
                <NavLinks
                    isStudent={isStudent}
                    isHomePage={isHomePage}
                    isLmsHomePage={isLmsHomePage}
                    isAuthenticated={isAuthenticated}
                    session={session}
                    menuOpen={menuOpen}
                    onNavigate={navigateTo}
                    onSignOut={handleSignOut}
                    notificationProps={notificationProps}
                    notificationRef={notificationRef}
                />
            </div>
        </nav>
    );
}
