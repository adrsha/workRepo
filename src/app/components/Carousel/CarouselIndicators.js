'use client';
import styles from '../../../styles/Carousel.module.css';

const CarouselIndicators = ({ images, currentIndex, onGoToSlide }) => {
    if (images.length <= 1) return null;

    return (
        <div className={styles.carouselIndicators}>
            {images.map((_, index) => (
                <button
                    key={index}
                    className={`${styles.indicator} ${index === currentIndex ? styles.indicatorActive : ''}`}
                    onClick={() => onGoToSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                />
            ))}
        </div>
    );
};

export default CarouselIndicators;
