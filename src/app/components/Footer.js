'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from '../../styles/Footer.module.css';
import dynamic from 'next/dynamic';

const FooterAdmin = dynamic(() => import('./FooterAdmin'), {
    ssr: false,
    loading: () => <div>Loading admin panel...</div>
});

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

export default function Footer() {
    const { data: session, status } = useSession();
    const [footerData, setFooterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isAdmin = session?.user?.level === 2;
    
    useEffect(() => {
        const loadFooterData = async () => {
            setLoading(true);
            const result = await fetchFooterData();
 
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
        return (
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div>Loading footer...</div>
                </div>
            </footer>
        );
    }

    if (error || !footerData) {
        return (
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div>Error loading footer</div>
                </div>
            </footer>
        );
    }

    const { config, sections, socialLinks } = footerData;

    if (!config) {
        return null;
    }

    return (
        <>
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.companyInfo}>
                        <h3>{config.company_name}</h3>
                        <p>{config.company_description}</p>

                        {socialLinks?.length > 0 && (
                            <div className={styles.socialIcons}>
                                {socialLinks.map((social) => (
                                    <a
                                        key={social.id}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.platform}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <g dangerouslySetInnerHTML={{ __html: social.icon_svg }} />
                                        </svg>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {sections?.map((section) => (
                        <div key={section.id} className={styles.quickLinks}>
                            <h4>{section.title}</h4>
                            {section.links?.length > 0 && (
                                <ul>
                                    {section.links.map((link) => (
                                        <li key={link.id}>
                                            <a href={link.url}>{link.title}</a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}

                    <div className={styles.contactInfo}>
                        <h4>Contact Us</h4>
                        <div className={styles.contactList}>
                            {config.contact_phone && (
                                <div className={styles.contactItem}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                    <span>{config.contact_phone}</span>
                                </div>
                            )}

                            {config.contact_email && (
                                <div className={styles.contactItem}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    <span>{config.contact_email}</span>
                                </div>
                            )}

                            {config.contact_address && (
                                <div className={styles.contactItem}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    <span>{config.contact_address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.bottomBar}>
                    <p>© {new Date().getFullYear()} {config.company_name}. {config.copyright_text}</p>
                </div>
            </footer>
            
            {status === 'authenticated' && isAdmin && <FooterAdmin />}
        </>
    );
}
