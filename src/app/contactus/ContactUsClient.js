'use client';

import styles from '../../styles/ContactUs.module.css';
import '../global.css';
import { useState, useEffect } from 'react';
import { fetchFooterData } from '../lib/footerActions';
import Loading from '../components/Loading';

export default function ContactUsClient() {
    const [footerData, setFooterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchFooterData(setFooterData, setLoading, setError);
    }, []);

    if (loading) {
        return <Loading />;
    }

    if (error || !footerData) {
        return <div className={styles.error}>{error || "Error loading company information"}</div>;
    }

    const { config } = footerData;

    return (
        <div className={styles.contactUsContainer}>
            <h1 className={styles.heading}>Contact Us</h1>
            <p className={styles.text}>
                Have questions, feedback, or need assistance? We're here to help!  
                Reach out to us using the contact details below.
            </p>
            <h2 className={styles.subheading}>Get in Touch</h2>
            <ul className={styles.list}>
                <li className={styles.listItem}>
                    <strong>Email:</strong> <a className={styles.link} href={"mailto:" + config.contact_email}>{config.contact_email}</a>
                </li>
                <li className={styles.listItem}>
                    <strong>Phone:</strong> {config.contact_phone}
                </li>
                <li className={styles.listItem}>
                    <strong>Address:</strong> {config.contact_address}
                </li>
            </ul>
        </div>
    );
}
