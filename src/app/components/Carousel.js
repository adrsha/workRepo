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
];

const getCurrentImageIndex = (totalImages, cycleDuration) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % totalImages);
    }, cycleDuration);
    
    return () => clearInterval(interval);
  }, [totalImages, cycleDuration]);
  
  return currentIndex;
};

const DescriptionBox = ({ description }) => (
  <div className={styles.descriptionBox}>
    <p className={styles.descriptionText}>{description}</p>
  </div>
);

export default function Carousel() {
  const currentIndex = getCurrentImageIndex(images.length, 3000);

  return (
    <div className={styles.carousel}>
      {images.map((img, index) => (
        <img
          key={index}
          src={img.src}
          alt={img.alt}
          className={styles.carouselImage}
        />
      ))}
      <DescriptionBox description={images[currentIndex].description} />
    </div>
  );
}
