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
            
            {/* Show AdminPanel when admin mode is active, regardless of image count */}
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

            {/* Show carousel content only when not in admin mode */}
            {!isAdminMode && (
                <>
                    {images.length === 0 ? (
                        <div className={styles.carouselEmpty}>
                            <p>No images available</p>
                            {isAdministrator && (
                                <button onClick={() => setIsAdminMode(true)} className={styles.adminToggle}>
                                    Add Images
                                </button>
                            )}
                        </div>
                    ) : (
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
                </>
            )}
        </div>
    );
};

export default Carousel;
