'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from '../styles/Home.module.css';
import './global.css';
import Carousel from './components/Carousel/Carousel';
import DownloadContent from "./components/DownloadContent";
import Advertisement from './components/Advertisement';
import NoticesSection from './components/Notices';
import Loading from './components/Loading';

export default function HomePageClient({ featureSidesData, featuresData }) {
    const [animatedFeatures, setAnimatedFeatures] = useState({});
    const [isFullscreen, setIsFullscreen] = useState(false);

    const featuresRef = useRef(null);
    const noticesRef = useRef(null);

    const { data: session, status } = useSession();
    const isAdmin = session?.user?.level === 2;

    const handleFullscreenToggle = () => {
        setIsFullscreen(!isFullscreen);
    };

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

    if (status === 'loading') {
        return (
            <Loading/>
        );
    }

    const renderFeatureSide = (feature, index) => (
        <Link
            key={index}
            href={feature.route}
            className={`${styles.featureSide} ${styles.featureLink} ${animatedFeatures.hoveredFeature === index ? styles.featureActive : ''}`}
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
        </Link>
    );

    const renderMainFeature = (feature, index) => {
        // Special handling for fullscreen features (index 2 and 3)
        if (index === 2) {
            return (
                <button
                    key={index}
                    className={`${styles.feature} ${styles.featureButton} ${animatedFeatures.hoveredFeature === index ? styles.featureActive : ''}`}
                    onClick={handleFullscreenToggle}
                    onMouseEnter={() => handleFeatureHover(index)}
                    onMouseLeave={handleFeatureLeave}
                    aria-label={`Open ${feature.title} in fullscreen`}
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
                </button>
            );
        }

        return (
            <Link
                key={index}
                href={feature.route}
                className={`${styles.feature} ${styles.featureLink} ${animatedFeatures.hoveredFeature === index ? styles.featureActive : ''}`}
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
            </Link>
        );
    };

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
                    <nav className={styles.fullscreenFeatureSides}>
                        {featureSidesData.map(renderFeatureSide)}
                    </nav>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <section className={styles.hero}>
                <Carousel isAdmin={isAdmin} />

                <nav
                    className={`${styles.featureSides} ${animatedFeatures.visible ? styles.featuresVisible : ''}`}
                    ref={featuresRef}
                    aria-label="Main features navigation"
                >
                    {featureSidesData.map(renderFeatureSide)}
                    <div className={styles.ctaSection}>
                        <p>"for no cost low cost tuition"</p>
                        <Link href='/registration/signup'>
                            <button className={styles.ctaButton}>Register Now!</button>
                        </Link>
                    </div>
                </nav>
            </section>

            <section className={styles.mainContent}>
                <NoticesSection />
                    <div className={`${styles.features} ${animatedFeatures.visible ? styles.featuresVisible : ''}`}>
                        {featuresData.map(renderMainFeature)}
                    </div>

                <div
                    className={`${styles.contentSection} ${animatedFeatures.noticesVisible ? styles.noticesVisible : ''}`}
                    ref={noticesRef}
                >
                </div>
 
                <Advertisement isAdmin={isAdmin} />

                <div className={styles.downloadContent}>
                    <DownloadContent />
                </div>

            </section>

            {renderFullscreenOverlay()}
        </div>
    );
}
