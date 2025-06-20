import { useState, useEffect } from 'react';
import styles from '../../styles/Carousel.module.css';

const images = [
    {
        src: 'https://picsum.photos/id/1015/1200/500',
        alt: 'Modern education concept',
        description: 'Discover innovative learning approaches that adapt to modern educational needs and technological advancement.'
    },
    {
        src: 'https://picsum.photos/id/1025/1200/500',
        alt: 'Studying resources',
        description: 'Access comprehensive study materials and resources designed to enhance your learning experience.'
    },
    {
        src: 'https://picsum.photos/id/1035/1200/500',
        alt: 'Online learning setup',
        description: 'Create the perfect environment for online learning with optimized tools and workspace organization.'
    },
    {
        src: 'https://picsum.photos/id/1035/1200/500',
        alt: 'Online learning setup',
        description: 'Create the perfect environment for online learning with optimized tools and workspace organization.'
    },
];

const Carousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const extendedImages = [...images, images[0]]; 
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                if (prev === images.length - 1) {
                    setTimeout(() => {
                        setCurrentIndex(0);
                    }, 500); 
                    return prev + 1;
                }
                return prev + 1;
            });
        }, 3000); // Change image every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div 
            className={styles.carousel}
            style={{ '--total-images': extendedImages.length }} // Set CSS custom property
        >
            <div
                className={styles.carouselTrack}
                style={{
                    transform: `translateX(-${currentIndex * 100}%)`,
                    transition: currentIndex === 0 ? 'none' : 'transform 0.5s ease-in-out',
                }}
            >
                {extendedImages.map((img, index) => (
                    <div key={index} className={styles.carouselItem}>
                        <img
                            src={img.src}
                            alt={img.alt}
                            className={styles.carouselImage}
                        />
                        <div className={styles.descriptionBox}>
                            <p className={styles.descriptionText}>{img.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Carousel;
