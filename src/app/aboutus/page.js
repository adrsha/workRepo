import styles from '../../styles/AboutUs.module.css';
import '../global.css';
import { getMetadata } from '../seoConfig';
export const metadata = getMetadata('aboutus');

export default function AboutUs() {
    return (
        <div className={styles.aboutUsContainer}>
            <h1 className={styles.heading}>About Us</h1>
            <p className={styles.text}>
                Welcome to Merotuition! This is our Learning Management System (LMS), 
                designed to provide the best educational experience for students and instructors.
            </p>
            <h2 className={styles.subheading}>Our Mission</h2>
            <p className={styles.text}>
                Our mission is to deliver high-quality educational services that make learning 
                accessible, efficient, and engaging. We believe in continuous improvement 
                and adapting to the latest technological advancements in education.
            </p>
            <h2 className={styles.subheading}>Our Values</h2>
            <ul className={styles.list}>
                <li className={styles.listItem}><strong>Innovation:</strong> We embrace change and push boundaries in education.</li>
                <li className={styles.listItem}><strong>Integrity:</strong> Honesty and transparency guide our decisions.</li>
                <li className={styles.listItem}><strong>Student-Centric:</strong> Our learners are at the heart of everything we do.</li>
                <li className={styles.listItem}><strong>Collaboration:</strong> We believe teamwork leads to great achievements in learning.</li>
            </ul>
        </div>
    );
}
