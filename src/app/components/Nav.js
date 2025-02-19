'use client';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Nav.module.css';
import { signOut, useSession } from 'next-auth/react';

const userNavElements = [{ name: 'Edit profile', path: '/settings' }];

export default function Nav() {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session, status } = useSession();

    return (
        <nav className={styles.navbar}>
            <div className={styles.logo} onClick={() => router.push('/')}>
                <img src="/logo_ref.svg" alt="logo" />
                MeroTuition
            </div>
            <div className={styles.navLinks}>
                {pathname !== '/' ? (
                    <button className="paperButtons" onClick={() => router.push('/classes')}>
                        Courses
                    </button>
                ) : null}
                <button className="paperButtons">Contact Us</button>
                <span className={styles.separator}></span>
                {status === 'authenticated' ? (
                    <>
                        {pathname === '/lmshome' ? null : (
                            <button className="paperButtons" onClick={() => router.push('/lmshome')}>
                                Home
                            </button>
                        )}
                        <span className={styles.dropdown}>
                            {session?.user?.name}
                            <ul>
                                {userNavElements.map((navElement) => (
                                    <a key={navElement.name} onClick={() => router.push(navElement.path)}>
                                        <li>{navElement.name}</li>
                                    </a>
                                ))}
                                {session.user.level === 2 ? (
                                    <a
                                        onClick={() => {
                                            router.push('/control');
                                        }}>
                                        <li>Control Panel</li>
                                    </a>
                                ) : null}
                                <a
                                    onClick={() => {
                                        signOut();
                                        router.push('/');
                                    }}>
                                    <li>Sign Out</li>
                                </a>
                            </ul>
                        </span>
                    </>
                ) : (
                    <>
                        <button className="paperButtons" onClick={() => router.push('/registration/login')}>
                            Login
                        </button>
                        <button
                            className={styles.specialNavButton + ' paperButtons'}
                            onClick={() => router.push('/registration/signup')}>
                            Sign Up
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
