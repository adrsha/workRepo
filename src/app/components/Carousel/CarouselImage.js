import styles from '../../../styles/Carousel.module.css';

const CarouselImage = ({ img, isActive, onClick }) => (
    <div
        className={`${styles.carouselSlide} ${isActive ? styles.active : ''}`}
        onClick={onClick}
    >
        <img src={img.src} alt={img.alt} />
        <div className={styles.carouselCaption}>
            <p>{img.description}</p>
        </div>
    </div>
);

export default CarouselImage;
