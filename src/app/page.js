'use client';
import { useRouter } from 'next/navigation';
import baseStyles from '../styles/Home.module.css';

export default function HomePage() {
    const router = useRouter();

    return (
        <div className={baseStyles.container}>
            <main className={baseStyles.mainContent}>
                <div className={baseStyles.leftSection}>
                    <div className={baseStyles.profileCircle}></div>
                    <p className={baseStyles.platformText}>No Cost, Low Cost<br />Learning Platform</p>
                </div>

                <div className={baseStyles.menuButtons}>
                    <button 
                        className={baseStyles.menuButton}
                        onClick={() => router.push('/courses')}
                    >
                        Courses
                    </button>
                    <button
                        className={baseStyles.menuButton}
                        onClick={() => router.push('/preparation')}
                    >
                        Preparation
                    </button>
                    <button
                        className={baseStyles.menuButton}
                        onClick={() => router.push('/languages')}
                    >
                        Language Classes
                    </button>
                    <button
                        className={baseStyles.menuButton}
                        onClick={() => router.push('/others')}
                    >
                        Others
                    </button>
                </div>
            </main>
        </div>
    );
}
