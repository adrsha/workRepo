'use client';
import { useRouter } from 'next/navigation';
import styles from '../styles/Home.module.css';
import "./global.css"

export default function HomePage() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <main className={styles.mainContent}>
                <div className={styles.leftSection}>
                    <img className={styles.profileCircle} src="/logo.png" alt="logo" />

                <div className={styles.menuButtons}>
                    <button 
                        className="paperButtons"
                        onClick={() => router.push('/courses')}
                    >
                        Courses
                    </button>
                    <button
                        className="paperButtons"
                        onClick={() => router.push('/preparation')}
                    >
                        Preparation
                    </button>
                    <button
                        className="paperButtons"
                        onClick={() => router.push('/languages')}
                    >
                        Language Classes
                    </button>
                    <button
                        className="paperButtons"
                        onClick={() => router.push('/others')}
                    >
                        Others
                    </button>
                </div>
                </div>
            </main>
        </div>
    );
}
