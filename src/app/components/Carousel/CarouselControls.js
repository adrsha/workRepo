import styles from '../../../styles/Carousel.module.css';

const CarouselControls = ({ 
    showControls, 
    isPlaying, 
    onPrevSlide, 
    onNextSlide, 
    onTogglePlayPause 
}) => {
    if (!showControls) return null;

    return (
        <>
            <button
                className={`${styles.carouselNav} ${styles.carouselNavPrev}`}
                onClick={onPrevSlide}
                aria-label="Previous image"
            >
                ‹
            </button>
            <button
                className={`${styles.carouselNav} ${styles.carouselNavNext}`}
                onClick={onNextSlide}
                aria-label="Next image"
            >
                ›
            </button>
            <button
                className={styles.carouselPlayPause}
                onClick={onTogglePlayPause}
                aria-label={isPlaying ? 'Pause carousel' : 'Play carousel'}
            >
                {isPlaying ? '⏸' : '▶'}
            </button>
        </>
    );
};

export default CarouselControls;
