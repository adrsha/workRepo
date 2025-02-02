'use client';

import { useRouter } from 'next/navigation';
import styles from '../../styles/Nav.module.css';
export default function Nav() {
    
  const router = useRouter();
  return (
      <nav className={styles.navbar}>
        <div className={styles.logo} onClick={() => router.push('/')}>
        <img src="/logo.svg" alt="logo" />
            MeroTuition
        </div>
        <div className={styles.navLinks}>
          <button className="paperButtons">Contact Us</button>
          <button className="paperButtons">About Us</button>
          <span className={styles.separator}></span>
          <button className="paperButtons" onClick={() => router.push('/registration/login')}>Login</button>
          <button className={styles.specialNavButton + " paperButtons"} onClick={() => router.push('/registration/signup')}>Sign Up</button>
        </div>
      </nav>
  );
}   
