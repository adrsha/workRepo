import styles from '../../styles/ContactUs.module.css';
import '../global.css'
import { SEO } from '../seoConfig';

export default function ContactUs() {
    return (
        <div className={styles.contactUsContainer}>
            <SEO pageKey={"contactus"} />
            <h1 className={styles.heading}>Contact Us</h1>
            <p className={styles.text}>
                Have questions, feedback, or need assistance? We're here to help!  
                Reach out to us using the contact details below.
            </p>
            <h2 className={styles.subheading}>Get in Touch</h2>
            <ul className={styles.list}>
                <li className={styles.listItem}>
                    <strong>Email:</strong> <a className={styles.link} href="mailto:info@merotuition.com">info@merotuition.com</a>
                </li>
                <li className={styles.listItem}>
                    <strong>Phone:</strong> +977 9849377705
                </li>
                <li className={styles.listItem}>
                    <strong>Address:</strong> Tyangla, Kirtipur, Kathmandu
                </li>
            </ul>
        </div>
    );
}
