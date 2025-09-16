// /app/components/Advertisement.js
'use client';
import { useState, useEffect } from 'react';
import styles from '@/styles/Advertisements.module.css';
import FileUpload from './FileUpload';

const AdvertisementModal = ({
    isOpen,
    onClose,
    advertisement,
    onSave
}) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        link: '',
        image: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (advertisement) {
            setFormData({
                title: advertisement.title || '',
                description: advertisement.description || '',
                link: advertisement.link || '',
                image: advertisement.image || null
            });
        } else {
            setFormData({
                title: '',
                description: '',
                link: '',
                image: null
            });
        }
        setError('');
    }, [advertisement, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageUpload = (uploadResult) => {
        setFormData(prev => ({
            ...prev,
            image: uploadResult.filePath
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim() || !formData.link.trim()) {
            setError('Title and link are required');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const submitFormData = new FormData();
            submitFormData.append('title', formData.title.trim());
            submitFormData.append('description', formData.description.trim());
            submitFormData.append('link', formData.link.trim());

            // Handle image - if it's a string (file path), send as imagePath
            // If it's a File object, send as image
            if (formData.image) {
                if (typeof formData.image === 'string') {
                    // This is a file path from previous upload
                    submitFormData.append('imagePath', formData.image);
                } else {
                    // This is a File object for new upload
                    submitFormData.append('image', formData.image);
                }
            }

            const url = advertisement ?
                `/api/advertisements/${advertisement.id}` :
                '/api/advertisements';

            const method = advertisement ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                body: submitFormData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save advertisement');
            }

            const savedAdvertisement = await response.json();
            onSave(savedAdvertisement);
            onClose();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <section className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>{advertisement ? 'Edit Advertisement' : 'Add New Advertisement'}</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.advertisementForm}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            Title *
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className={styles.formInput}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className={styles.formTextarea}
                            rows={4}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            Link *
                        </label>
                        <input
                            type="url"
                            name="link"
                            value={formData.link}
                            onChange={handleInputChange}
                            className={styles.formInput}
                            placeholder="https://example.com"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            Advertisement Image
                        </label>
                        <FileUpload
                            parentId="advertisements"
                            parentType="advertisements"
                            onUploadComplete={handleImageUpload}
                            showUploadActions={true}
                            showCancelButton={true}
                        />

                        {(advertisement?.image || formData.image) && (
                            <div className={styles.currentImagePreview}>
                                <p>Current Image:</p>
                                <img
                                    src={formData.image || advertisement.image}
                                    alt="Current advertisement"
                                    className={styles.previewImage}
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div style={{ color: 'red', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : (advertisement ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

const AdvertisementCard = ({
    advertisement,
    isAdmin = false,
    onEdit,
    onDelete
}) => {
    const handleCardClick = (e) => {
        // Don't navigate if clicking edit/delete buttons
        if (e.target.closest('.admin-actions')) {
            e.preventDefault();
            return;
        }

        // Open advertisement link in new tab
        if (advertisement.link) {
            window.open(advertisement.link, '_blank', 'noopener,noreferrer');
        }
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(advertisement);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (onDelete && advertisement.id) {
            if (window.confirm('Are you sure you want to delete this advertisement?')) {
                onDelete(advertisement.id);
            }
        }
    };

    return (
        <div
            className={styles.advertisementCard}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
        >
            {advertisement.image && (
                <div className={styles.advertisementImageContainer}>
                    <img
                        src={advertisement.image}
                        alt={advertisement.title || 'Advertisement'}
                        className={styles.advertisementImage}
                        loading="lazy"
                    />
                </div>
            )}

            <div className={styles.advertisementContent}>
                <h3 className={styles.advertisementName}>
                    {advertisement.title}
                </h3>

                {advertisement.description && (
                    <p className={styles.advertisementDescription}>
                        {advertisement.description}
                    </p>
                )}

                <div className={styles.advertisementUrl}>
                    View Details ( पूरा विवरण हेर्नुहोस् )  →
                </div>
            </div>

            {isAdmin && (
                <div className={`${styles.adminActions} admin-actions`}>
                    <button
                        className={styles.editButton}
                        onClick={handleEdit}
                    >
                        Edit
                    </button>
                    <button
                        className={styles.deleteButton}
                        onClick={handleDelete}
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

const AdvertisementManager = ({ isAdmin = false }) => {
    const [advertisements, setAdvertisements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdvertisement, setEditingAdvertisement] = useState(null);

    const fetchAdvertisements = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/advertisements');

            if (!response.ok) {
                throw new Error('Failed to fetch advertisements');
            }

            const data = await response.json();
            setAdvertisements(data);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching advertisements:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingAdvertisement(null);
        setIsModalOpen(true);
    };

    const handleEdit = (advertisement) => {
        setEditingAdvertisement(advertisement);
        setIsModalOpen(true);
    };

    const handleDelete = async (advertisementId) => {
        try {
            const response = await fetch(`/api/advertisements/${advertisementId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete advertisement');
            }

            setAdvertisements(prev =>
                prev.filter(ad => ad.id !== advertisementId)
            );
        } catch (err) {
            console.error('Error deleting advertisement:', err);
            alert('Failed to delete advertisement');
        }
    };

    const handleSave = (savedAdvertisement) => {
        if (editingAdvertisement) {
            // Update existing
            setAdvertisements(prev =>
                prev.map(ad =>
                    ad.id === savedAdvertisement.id ? savedAdvertisement : ad
                )
            );
        } else {
            // Add new
            setAdvertisements(prev => [savedAdvertisement, ...prev]);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAdvertisement(null);
    };

    useEffect(() => {
        fetchAdvertisements();
    }, []);

    if (loading) return <div>Loading advertisements...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <section className={styles.advertisementsContainer}>
            <h1 className={styles.advertisementsTitle}>Advertisements</h1>
            <div className={styles.advertisementsHeader}>
                {isAdmin && (
                    <button
                        className={styles.addButton}
                        onClick={handleAdd}
                    >
                        Add Advertisement
                    </button>
                )}
            </div>

            {advertisements.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No advertisements found.</p>
                    {isAdmin && (
                        <button
                            className={styles.addButton}
                            onClick={handleAdd}
                        >
                            Create First Advertisement
                        </button>
                    )}
                </div>
            ) : (
                <div className={styles.advertisementsGrid}>
                    {advertisements.map(advertisement => (
                        <AdvertisementCard
                            key={advertisement.id}
                            advertisement={advertisement}
                            isAdmin={isAdmin}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            <AdvertisementModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                advertisement={editingAdvertisement}
                onSave={handleSave}
            />
        </section>
    );
};

// Export individual components for flexible usage
export { AdvertisementCard, AdvertisementModal };

// Export the main manager component as default
export default AdvertisementManager;
