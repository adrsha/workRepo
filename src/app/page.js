'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/Home.module.css';
import './global.css';
import { fetchData } from './lib/helpers';
import Carousel from './components/Carousel';
import DownloadContent from "./components/DownloadContent";

// Feature data configuration
const FEATURE_SIDES_DATA = [
    {
        title: 'Course Classes',
        img: '/course.png',
        color: '--primary',
        route: '/classes',
    },
    {
        title: 'Preparation Classes',
        img: '/preparation.png',
        color: '--secondary',
        route: '/preparation',
    },
    {
        title: 'Language Classes',
        img: '/language.png',
        color: '--tertiary',
        route: '/languages',
    },
    {
        title: 'Other Classes',
        img: '/others.png',
        color: '--quaternary',
        route: '/others',
    },
];

const FEATURES_DATA = [
    {
        title: 'Quizes',
        desc: 'Test your knowledge with our quizzes',
        img: '/course.png',
        color: '--primary',
        route: '/classes',
    },
    {
        title: 'Games',
        desc: 'Try our interactive games to learn faster',
        img: '/preparation.png',
        color: '--secondary',
        route: '/preparation',
    },
    {
        title: 'Available classes and courses',
        desc: 'Join our online classes and courses',
        img: '/language.png',
        color: '--tertiary',
        route: '/languages',
    },
    {
        title: 'Available Teachers',
        desc: 'Check out all of our available Teachers',
        img: '/others.png',
        color: '--quaternary',
        route: '/teachers',
    },
];

export default function HomePage() {
    const router = useRouter();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [animatedFeatures, setAnimatedFeatures] = useState({});
    const [isFullscreen, setIsFullscreen] = useState(false);

    const featuresRef = useRef(null);
    const noticesRef = useRef(null);

    // Navigation handlers
    const navigateToRoute = (route) => {
        router.push(route);
    };

    const handleFullscreenToggle = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handleFeatureClick = (feature, index) => {
        navigateToRoute(feature.route);
    };

    const handleMainFeatureClick = (feature, index) => {
        if (index === 2 || index === 3) {
        // if (index === 2 ) {
            handleFullscreenToggle();
        } else {
            navigateToRoute(feature.route);
        }
    };

    // Data fetching
    const loadNotices = async () => {
        try {
            const data = await fetchData("notices");
            setNotices(data);
        } catch (error) {
            console.error("Error fetching notices:", error);
        } finally {
            setLoading(false);
        }
    };

    // Animation handlers
    const handleFeatureHover = (index) => {
        setAnimatedFeatures(prev => ({
            ...prev,
            hoveredFeature: index
        }));
    };

    const handleFeatureLeave = () => {
        setAnimatedFeatures(prev => ({
            ...prev,
            hoveredFeature: null
        }));
    };

    // Intersection Observer setup
    const setupIntersectionObserver = () => {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const handleIntersection = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (entry.target === featuresRef.current) {
                        setAnimatedFeatures(prev => ({ ...prev, visible: true }));
                    }
                    if (entry.target === noticesRef.current) {
                        setAnimatedFeatures(prev => ({ ...prev, noticesVisible: true }));
                    }
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersection, observerOptions);

        if (featuresRef.current) {
            observer.observe(featuresRef.current);
        }
        if (noticesRef.current) {
            observer.observe(noticesRef.current);
        }

        return observer;
    };

    // Utility functions
    const formatDate = (dateTimeString) => {
        if (!dateTimeString) return '';
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Effects
    useEffect(() => {
        loadNotices();
        const observer = setupIntersectionObserver();

        return () => {
            if (featuresRef.current) {
                observer.unobserve(featuresRef.current);
            }
            if (noticesRef.current) {
                observer.unobserve(noticesRef.current);
            }
        };
    }, []);

    // Render functions
    const renderFeatureSide = (feature, index) => (
        <div
            key={index}
            className={`${styles.featureSide} ${animatedFeatures.hoveredFeature === index ? styles.featureActive : ''}`}
            onClick={() => handleFeatureClick(feature, index)}
            onMouseEnter={() => handleFeatureHover(index)}
            onMouseLeave={handleFeatureLeave}
        >
            <div
                className={styles.featureIcon}
                style={{ backgroundColor: `var(${feature.color})` }}
            >
                <img src={feature.img} alt={feature.title} />
            </div>
            <h3>{feature.title}</h3>
        </div>
    );

    const renderMainFeature = (feature, index) => (
        <div
            key={index}
            className={`${styles.feature} ${animatedFeatures.hoveredFeature === index ? styles.featureActive : ''}`}
            onClick={() => handleMainFeatureClick(feature, index)}
            onMouseEnter={() => handleFeatureHover(index)}
            onMouseLeave={handleFeatureLeave}
        >
            <div
                className={styles.featureIcon}
                style={{ backgroundColor: `var(${feature.color})` }}
            >
                <img src={feature.img} alt={feature.title} />
            </div>
            <h3>{feature.title}</h3>
            <p style={{ backgroundColor: `var(${feature.color}Lighter)` }}>
                {feature.desc}
            </p>
        </div>
    );

    const renderNoticeItem = (notice, index) => (
        <div
            key={notice.notices_id}
            className={styles.noticeItem}
            style={{ animationDelay: `${0.1 * (index + 1)}s` }}
        >
            <div className={styles.noticeHeader}>
                <div className={styles.noticeDateTime}>
                    {formatDate(notice.notice_date_time)}
                </div>
            </div>
            <div className={styles.noticeContent}>
                {notice.notice_content}
            </div>
        </div>
    );

    const renderNoticesSection = () => (
        <section className={styles.noticesSection}>
            <h2>Latest Updates</h2>
            {loading ? (
                <div className={styles.loadingNotices}>Loading updates...</div>
            ) : notices.length > 0 ? (
                <div className={styles.noticesList}>
                    {notices.slice(0, 3).map(renderNoticeItem)}
                    {notices.length > 3 && (
                        <button
                            className={styles.viewAllButton}
                            onClick={() => navigateToRoute('/notices')}
                        >
                            View All Updates
                        </button>
                    )}
                </div>
            ) : (
                <div className={styles.noNotices}>No updates available</div>
            )}
        </section>
    );

    const renderFullscreenOverlay = () => {
        if (!isFullscreen) return null;

        return (
            <div className={styles.fullscreenOverlay}>
                <div className={styles.fullscreenContent}>
                    <button
                        className={styles.closeButton}
                        onClick={handleFullscreenToggle}
                        aria-label="Close fullscreen"
                    >
                        ✕
                    </button>
                    <div className={styles.fullscreenFeatureSides}>
                        {FEATURE_SIDES_DATA.map(renderFeatureSide)}
                        <center>
                            "for no cost low cost tuition" <br />
                            <button className={styles.ctaButton}>Register Now!</button>
                        </center>
                    </div>
                </div>
            </div>
        );
    };

    return (

        <div className={styles.container}>

            <section className={styles.hero}>
                <Carousel />
                <section
                    className={`${styles.featureSides} ${animatedFeatures.visible ? styles.featuresVisible : ''}`}
                    ref={featuresRef}
                >
                    {FEATURE_SIDES_DATA.map(renderFeatureSide)}
                    <center>
                        "for no cost low cost tuition" <br />
                        <button className={styles.ctaButton}>Register Now!</button>
                    </center>
                </section>

                {renderNoticesSection()}
            </section>

            <section
                className={`${styles.features} ${animatedFeatures.visible ? styles.featuresVisible : ''}`}
                ref={featuresRef}
            >
                {FEATURES_DATA.map(renderMainFeature)}
            </section>

            <div
                className={`${styles.contentSection} ${animatedFeatures.noticesVisible ? styles.noticesVisible : ''}`}
                ref={noticesRef}
            >
                <div></div>
                <DownloadContent />
            </div>

            {renderFullscreenOverlay()}
        </div>
    );
}
