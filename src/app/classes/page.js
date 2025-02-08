'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '../../styles/Classes.module.css';
import Loading from '../components/Loading.js';
import '../global.css';
import { fetchData } from '../lib/helpers.js';

export default function ClassesPage() {
    
    const router = useRouter();
    const [classesData, setClassesData] = useState([]);

    useEffect(() => {
        fetchData('classes').then((data) => setClassesData(data));
    }, []);

    return (
        <div className={styles.container}>
            <h1 className={styles.centeredHeader}>Classes</h1>
            <div className={styles.classCards}>
                {classesData.length > 0 ? (
                    classesData.map((classDetails) => {
                        return (
                            <div
                                className={styles.classCard + ' paperButtons'}
                                key={classDetails.class_id}
                                onClick={() => {
                                    return router.push(`/classes/${classDetails.class_id}`);
                                }}>
                                <h2>{classDetails.class_name[0].toUpperCase() + classDetails.class_name.slice(1)}</h2>
                            </div>
                        );
                    })
                ) : (
                    <Loading />
                )}
            </div>
        </div>
    );
}

// const router = useRouter();
//
// const subjects = ['Physics', 'Chemistry', 'Biology', 'English'];
// <main className={styles.mainContent}>
//     <h2>Class 1</h2>
//     <div className={styles.subjectsGrid}>
//       {subjects.map((subject) => (
//         <div
//           key={subject}
//           className={styles.subjectCard}
//           onClick={() => router.push(`/teachers/${subject.toLowerCase()}`)}
//         >
//           <div className={styles.subjectIcon}></div>
//           <p>{subject}</p>
//         </div>
//       ))}
//     </div>
//
//   <section>
//     <h2>Class 2</h2>
//     <div className={styles.subjectsGrid}>
//       {subjects.map((subject) => (
//         <div
//           key={subject}
//           className={styles.subjectCard}
//           onClick={() => router.push(`/teachers/${subject.toLowerCase()}`)}
//         >
//           <div className={styles.subjectIcon}></div>
//           <p>{subject}</p>
//         </div>
//       ))}
//     </div>
//   </section>
// </main>
