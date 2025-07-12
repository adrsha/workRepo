'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from '../styles/Home.module.css';
import './global.css';
import Carousel from './components/Carousel/Carousel';
import DownloadContent from "./components/DownloadContent";
import NoticesSection from './components/Notices';
import ClientLayout from './ClientLayout';

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
    const [animatedFeatures, setAnimatedFeatures] = useState({});
    const [isFullscreen, setIsFullscreen] = useState(false);

    const featuresRef = useRef(null);
    const noticesRef = useRef(null);

    const { data: session, status } = useSession();
    
    // Don't try to access session.user until session is loaded
    const isAdmin = session?.user?.level === 2;

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
            handleFullscreenToggle();
        } else {
            navigateToRoute(feature.route);
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

    // Effects
    useEffect(() => {
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

    // Show loading state while session is being fetched
    if (status === 'loading') {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

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
                            <a href='/registration/signup'><button className={styles.ctaButton}>Register Now!</button></a>
                        </center>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <section className={styles.hero}>
                <Carousel isAdmin={isAdmin} />
                <section
                    className={`${styles.featureSides} ${animatedFeatures.visible ? styles.featuresVisible : ''}`}
                    ref={featuresRef}
                >
                    {FEATURE_SIDES_DATA.map(renderFeatureSide)}
                    <center>
                        "for no cost low cost tuition" <br />
                        <a href='/registration/signup'><button className={styles.ctaButton}>Register Now!</button></a>
                    </center>
                </section>

                <NoticesSection />
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
