'use client'
import CarouselImage from './CarouselImage';
import AdminPanel from './AdminPanel';
import CarouselControls from './CarouselControls';
import CarouselIndicators from './CarouselIndicators';
import useCarousel from './useCarousel';
import styles from '../../../styles/Carousel.module.css';

const Carousel = ({ isAdmin = false }) => {
    const {
        images,
        currentIndex,
        isPlaying,
        isAdminMode,
        isLoading,
        error,
        isAdministrator,
        setIsAdminMode,
        goToSlide,
        nextSlide,
        prevSlide,
        togglePlayPause,
        handleImageUpload,
        handleUpdateImage,
        handleDeleteImage,
        handleDragStart,
        handleDragOver,
        handleDrop
    } = useCarousel(isAdmin);

    if (isLoading) {
        return (
            <div className={styles.carouselContainer}>
                <div className={styles.carouselEmpty}>
                    <p>Loading carousel images...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.carouselContainer}>
                <div className={styles.carouselEmpty}>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className={styles.carouselContainer}>
                <div className={styles.carouselEmpty}>
                    <p>No images available</p>
                    {isAdministrator && (
                        <button onClick={() => setIsAdminMode(true)} className={styles.adminToggle}>
                            Add Images
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.carouselContainer}>
            {isAdministrator && (
                <div className={styles.adminControls}>
                    <button
                        onClick={() => setIsAdminMode(!isAdminMode)}
                        className={`${styles.adminToggle} ${isAdminMode ? styles.adminToggleActive : ''}`}
                    >
                        {isAdminMode ? 'Exit Admin Mode' : 'Admin Mode'}
                    </button>
                </div>
            )}
            
            {isAdministrator && isAdminMode && (
                <AdminPanel
                    images={images}
                    onImageUpload={handleImageUpload}
                    onUpdateImage={handleUpdateImage}
                    onDeleteImage={handleDeleteImage}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
            )}

            {!isAdminMode && (
                <div className={styles.carouselWrapper}>
                    <div className={styles.carouselMain}>
                        <div
                            className={styles.carouselTrack}
                            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                        >
                            {images.map((img, index) => (
                                <CarouselImage
                                    key={img.id}
                                    img={img}
                                    isActive={index === currentIndex}
                                    onClick={() => goToSlide(index)}
                                />
                            ))}
                        </div>

                        <CarouselControls
                            showControls={images.length > 1}
                            isPlaying={isPlaying}
                            onPrevSlide={prevSlide}
                            onNextSlide={nextSlide}
                            onTogglePlayPause={togglePlayPause}
                        />
                    </div>

                    <CarouselIndicators
                        images={images}
                        currentIndex={currentIndex}
                        onGoToSlide={goToSlide}
                    />
                </div>
            )}
        </div>
    );
};

export default Carousel;
