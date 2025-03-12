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
                <img src="/logo_ref.svg" alt="MeroTuition Logo" />
            </div>
            <div className={styles.navLinks}>
                {session?.user?.level === 0 ? (
                    pathname !== '/' ? (
                        <button onClick={() => router.push('/classes')}>Courses</button>
                    ) : null
                ) : null}
                <button onClick={() => router.push('/aboutus')}>About Us</button>
                <button onClick={() => router.push('/contactus')}>Contact Us</button>
                {status === 'authenticated' ? (
                    <>
                        {pathname === '/lmshome' ? null : <button onClick={() => router.push('/lmshome')}>Home</button>}
                        <span className={styles.dropdown}>
                            <a className={styles.dropdownUname} onClick={
                                ()=>router.push(`/profile/${session?.user?.id}`)
                            }> {session?.user?.name} </a>
                            <ul>
                                {userNavElements.map((navElement) => (
                                    <a key={navElement.name} onClick={() => router.push(navElement.path)}>
                                        <li>{navElement.name}</li>
                                    </a>
                                ))}
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
                        <button onClick={() => router.push('/registration/signup')}>Sign Up</button>
                        <button className={styles.specialNavButton} onClick={() => router.push('/registration/login')}>
                            Login
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
