'use client';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Courses.module.css';

export default function CoursesPage() {
  const router = useRouter();
  
  const subjects = ['Physics', 'Chemistry', 'Biology', 'English'];
  
  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <section>
          <h2>Class 1</h2>
          <div className={styles.subjectsGrid}>
            {subjects.map((subject) => (
              <div 
                key={subject} 
                className={styles.subjectCard}
                onClick={() => router.push(`/teachers/${subject.toLowerCase()}`)}
              >
                <div className={styles.subjectIcon}></div>
                <p>{subject}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Class 2</h2>
          <div className={styles.subjectsGrid}>
            {subjects.map((subject) => (
              <div 
                key={subject} 
                className={styles.subjectCard}
                onClick={() => router.push(`/teachers/${subject.toLowerCase()}`)}
              >
                <div className={styles.subjectIcon}></div>
                <p>{subject}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
