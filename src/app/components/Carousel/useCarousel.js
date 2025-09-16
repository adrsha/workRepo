'use client';
import { useState, useEffect, useRef } from 'react';

const useCarousel = (isAdmin = false) => {
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdministrator, setIsAdministrator] = useState(isAdmin);
    const intervalRef = useRef(null);

    // Load images from backend
    useEffect(() => {
        const fetchImages = async () => {
            try {
                const response = await fetch('/api/carousel');
                if (!response.ok) {
                    throw new Error('Failed to fetch images');
                }
                const data = await response.json();
                setImages(data.images || []);
            } catch (error) {
                console.error('Error fetching images:', error);
                setError('Failed to load carousel images');
            } finally {
                setIsLoading(false);
            }
        };

        fetchImages();
    }, []);

    // Auto-play carousel
    useEffect(() => {
        if (isPlaying && !isAdminMode && images.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            }, 6000);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isPlaying, isAdminMode, images.length]);

    // Reset currentIndex if it's out of bounds
    useEffect(() => {
        if (images.length > 0 && currentIndex >= images.length) {
            setCurrentIndex(0);
        }
    }, [images.length, currentIndex]);

    useEffect(() => {
        setIsAdministrator(isAdmin);
    }, [isAdmin]);

    const goToSlide = (index) => {
        if (index >= 0 && index < images.length) {
            setCurrentIndex(index);
        }
    };

    const nextSlide = () => {
        if (images.length > 0) {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }
    };

    const prevSlide = () => {
        if (images.length > 0) {
            setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        }
    };

    const togglePlayPause = () => setIsPlaying(!isPlaying);

    const handleImageUpload = async (uploadResult) => {
        try {
            const response = await fetch('/api/carousel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    src: uploadResult.filePath,
                    alt: uploadResult.originalName,
                    description: 'New carousel image - click edit to add description',
                    caption: ''
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save image');
            }

            const data = await response.json();

            const newImage = {
                id: data.imageId,
                src: uploadResult.filePath,
                alt: uploadResult.originalName,
                description: 'New carousel image - click edit to add description',
                caption: ''
            };

            setImages(prevImages => [...prevImages, newImage]);
        } catch (error) {
            console.error('Error saving image:', error);
            alert('Failed to save image to database');
        }
    };

    const handleUpdateImage = (id, updatedData) => {
        setImages(prevImages =>
            prevImages.map(img => (img.id === id ? { ...img, ...updatedData } : img))
        );
    };

    const handleDeleteImage = (id) => {
        setImages(prevImages => {
            const newImages = prevImages.filter(img => img.id !== id);
            return newImages;
        });

        setCurrentIndex(prevIndex => {
            const newLength = images.length - 1;
            if (newLength === 0) return 0;
            if (prevIndex >= newLength) return newLength - 1;
            return prevIndex;
        });
    };

    const handleDragStart = (e, index) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === dropIndex) return;

        const newImages = [...images];
        const draggedImage = newImages[draggedItem];
        newImages.splice(draggedItem, 1);
        newImages.splice(dropIndex, 0, draggedImage);

        setImages(newImages);
        setDraggedItem(null);

        // Update currentIndex to follow the moved item
        if (currentIndex === draggedItem) {
            setCurrentIndex(dropIndex);
        } else if (currentIndex > draggedItem && currentIndex <= dropIndex) {
            setCurrentIndex(currentIndex - 1);
        } else if (currentIndex < draggedItem && currentIndex >= dropIndex) {
            setCurrentIndex(currentIndex + 1);
        }

        // Update order in backend
        try {
            const imageIds = newImages.map(img => img.id);
            const response = await fetch('/api/carousel?action=reorder', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageIds }),
            });

            if (!response.ok) {
                throw new Error('Failed to update order');
            }
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Failed to update image order');
        }
    };

    return {
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
    };
};

export default useCarousel;
