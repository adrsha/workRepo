'use client';

import { useRouter } from 'next/navigation';
import styles from '../../styles/Nav.module.css';
export default function Nav() {
    
  const router = useRouter();
  return (
      <nav className={styles.navbar}>
        <div className={styles.logo} onClick={() => router.push('/')}>
                 <img src="/small_logo.png" alt="logo" />
                MeroTuition
        </div>
        <div className={styles.navLinks}>
          <button>Contact Us</button>
          <button>About Us</button>
          <button className={styles.getStarted}>Get Started</button>
        </div>
      </nav>
  );
}   
