'use client';
import styles from '../../styles/ContactUs.module.css';
import '../global.css';
import { useState, useEffect } from 'react';
import Loading from '../components/Loading';

// Client-side fetch function with cache busting
const fetchFooterData = async () => {
    try {
        const response = await fetch(`/api/footer`);
        
        if (response.ok) {
            const data = await response.json();
            return { data, error: null };
        } else {
            return { data: null, error: 'Failed to fetch footer data' };
        }
    } catch (err) {
        return { data: null, error: err.message };
    }
};

export default function ContactUsClient() {
    const [footerData, setFooterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const loadFooterData = async () => {
            setLoading(true);
            const result = await fetchFooterData();
            console.log(result);
            if (result.error) {
                setError(result.error);
            } else {
                setFooterData(result.data);
            }
            setLoading(false);
        };

        loadFooterData();
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
