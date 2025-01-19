'use client';
import styles from '../../../styles/Teachers.module.css';
import { use } from 'react';

export default function TeacherPage({ params }) {
  const resolvedParams = use(params); 
  const teachers = [
    { id: 1, name: 'Teacher 1', time: '11:30 pm' },
    { id: 2, name: 'Teacher 2', time: '12:15 pm' },
    { id: 3, name: 'Teacher 3', time: '01:45 pm' },
    { id: 4, name: 'Teacher 4', time: '02:30 pm' }
  ];

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <div className={styles.teacherList}>
          <h2 className={styles.subjectTitle}>
            {resolvedParams?.subject?.charAt(0).toUpperCase() + resolvedParams?.subject?.slice(1)}
          </h2>
          
          {teachers.map((teacher) => (
            <div key={teacher.id} className={styles.teacherCard}>
              <div className={styles.upperRow}>
                <div className={styles.teacherInfo}>
                  <span className={styles.teacherIcon}>👨‍🏫</span>
                  <span>{teacher.name}</span>
                </div>
                <button className={styles.selectBtn}>Select</button>
              </div>
              
              <div className={styles.lowerRow}>
                <div className={styles.timeInfo}>
                  <span className={styles.clockIcon}>🕐</span>
                  <span>{teacher.time}</span>
                </div>
                <button className={styles.profileBtn}>View Profile</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
