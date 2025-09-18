// Enhanced Advertisement Component with styled sharing UI

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

            if (formData.image) {
                if (typeof formData.image === 'string') {
                    submitFormData.append('imagePath', formData.image);
                } else {
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


const ShareModal = ({ isOpen, onClose, advertisement }) => {
    const [copyStatus, setCopyStatus] = useState('');
    const [isNativeSupported, setIsNativeSupported] = useState(false);

    useEffect(() => {
        // Check native share support on mount and when advertisement changes
        if (advertisement && typeof navigator !== 'undefined' && navigator.share) {
            const shareData = {
                title: advertisement.title,
                text: advertisement.description || `Check out this advertisement: ${advertisement.title}`,
                url: advertisement.link
            };

            if (navigator.canShare) {
                setIsNativeSupported(navigator.canShare(shareData));
            } else {
                setIsNativeSupported(true); // Assume supported if canShare not available
            }
        } else {
            setIsNativeSupported(false);
        }
    }, [advertisement]);

    // Reset copy status when modal closes
    useEffect(() => {
        if (!isOpen) {
            setCopyStatus('');
        }
    }, [isOpen]);

    // Handle escape key press
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !advertisement) return null;

    // Enhanced share data with proper error handling
    const shareData = {
        title: advertisement.title,
        text: advertisement.description || `Check out this advertisement: ${advertisement.title}`,
        url: advertisement.link
    };

    const handleNativeShare = async () => {
        if (!navigator.share) {
            console.warn('Native sharing not supported');
            return;
        }

        try {
            await navigator.share(shareData);
            onClose();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error sharing:', err);
                // Fallback to copy link
                handleCopyLink();
            }
        }
    };

    const handleSocialShare = (platform) => {
        const encodedTitle = encodeURIComponent(advertisement.title);
        const encodedDescription = encodeURIComponent(advertisement.description || '');
        const encodedUrl = encodeURIComponent(advertisement.link);
        const shareText = encodeURIComponent(`${advertisement.title}${advertisement.description ? ' - ' + advertisement.description : ''}`);

        // Get the full image URL for sharing
        const imageUrl = advertisement.image ? encodeURIComponent(
            advertisement.image.startsWith('http')
                ? advertisement.image
                : `${window.location.origin}${advertisement.image}`
        ) : '';

        let shareUrl = '';

        switch (platform) {
            case 'whatsapp':
                shareUrl = `https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${shareText}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${shareText}`;
                break;
            case 'viber':
                shareUrl = `viber://forward?text=${shareText}%20${encodedUrl}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
            case 'pinterest':
                if (imageUrl) {
                    shareUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${imageUrl}&description=${shareText}`;
                } else {
                    shareUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${shareText}`;
                }
                break;
            case 'email':
                const emailSubject = encodeURIComponent(`Check out: ${advertisement.title}`);
                const emailBody = encodeURIComponent(
                    `${advertisement.title}\n\n` +
                    `${advertisement.description || ''}\n\n` +
                    `Link: ${advertisement.link}\n\n` +
                    (advertisement.image ? `Image: ${window.location.origin}${advertisement.image}\n\n` : '') +
                    `Shared from ${window.location.origin}`
                );
                shareUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;
                break;
            default:
                console.warn(`Unsupported platform: ${platform}`);
                return;
        }

        try {
            if (platform === 'email' || platform === 'viber') {
                window.location.href = shareUrl;
            } else {
                window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
            }
            onClose();
        } catch (err) {
            console.error(`Error sharing to ${platform}:`, err);
        }
    };

    const handleCopyLink = async () => {
        setCopyStatus('copying');

        try {
            // Try to copy rich content first
            const richContent = `${advertisement.title}\n${advertisement.description || ''}\nLink: ${advertisement.link}${advertisement.image ? `\nImage: ${window.location.origin}${advertisement.image}` : ''}`;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(richContent);
                setCopyStatus('copied');
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = richContent;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                if (document.execCommand('copy')) {
                    setCopyStatus('copied');
                } else {
                    throw new Error('Copy command failed');
                }

                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
            // Final fallback - try to copy just the URL
            try {
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(advertisement.link);
                    setCopyStatus('copied');
                } else {
                    setCopyStatus('error');
                }
            } catch (fallbackErr) {
                console.error('All copy attempts failed:', fallbackErr);
                setCopyStatus('error');
            }
        }

        // Reset status after 3 seconds
        setTimeout(() => {
            setCopyStatus('');
        }, 3000);
    };

    const handleModalClick = (e) => {
        // Close modal if clicking on overlay
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const getCopyButtonText = () => {
        switch (copyStatus) {
            case 'copying':
                return 'Copying...';
            case 'copied':
                return 'Link & Details Copied!';
            case 'error':
                return 'Failed to copy';
            default:
                return 'Copy Link & Details';
        }
    };

    const getCopyButtonClass = () => {
        const baseClass = styles.copyLinkButton;
        switch (copyStatus) {
            case 'copying':
                return `${baseClass} ${styles.copying}`;
            case 'copied':
                return `${baseClass} ${styles.copied}`;
            case 'error':
                return `${baseClass} ${styles.error}`;
            default:
                return baseClass;
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={handleModalClick}>
            <div className={styles.shareModalContent}>
                <div className={styles.modalHeader}>
                    <h3>Share Advertisement</h3>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close share modal"
                    >
                        ×
                    </button>
                </div>

                <div className={styles.shareContent}>
                    <div className={styles.sharePreview}>
                        <h4>{advertisement.title}</h4>
                        {advertisement.description && (
                            <p>{advertisement.description}</p>
                        )}
                        {advertisement.image && (
                            <div className={styles.shareImagePreview}>
                                <img
                                    src={advertisement.image}
                                    alt={advertisement.title}
                                    className={styles.sharePreviewImage}
                                    loading="lazy"
                                />
                                <span className={styles.imageLabel}>Image will be included in share if its compatible</span>
                            </div>
                        )}
                    </div>

                    {isNativeSupported && (
                        <div className={styles.nativeShareSection}>
                            <button
                                className={styles.nativeShareButton}
                                onClick={handleNativeShare}
                                aria-label="Share using device's native sharing"
                            >
                                Share using device
                            </button>
                        </div>
                    )}

                    <div className={styles.socialShareGrid}>
                        <button
                            className={`${styles.shareButton} ${styles.whatsapp}`}
                            onClick={() => handleSocialShare('whatsapp')}
                            aria-label="Share on WhatsApp"
                        >
                            <span className={styles.shareIcon} aria-hidden="true"></span>
                            WhatsApp
                        </button>

                        <button
                            className={`${styles.shareButton} ${styles.facebook}`}
                            onClick={() => handleSocialShare('facebook')}
                            aria-label="Share on Facebook"
                        >
                            <span className={styles.shareIcon} aria-hidden="true"></span>
                            Facebook
                        </button>

                        <button
                            className={`${styles.shareButton} ${styles.twitter}`}
                            onClick={() => handleSocialShare('twitter')}
                            aria-label="Share on Twitter"
                        >
                            <span className={styles.shareIcon} aria-hidden="true"></span>
                            Twitter
                        </button>

                        <button
                            className={`${styles.shareButton} ${styles.telegram}`}
                            onClick={() => handleSocialShare('telegram')}
                            aria-label="Share on Telegram"
                        >
                            <span className={styles.shareIcon} aria-hidden="true"></span>
                            Telegram
                        </button>

                        <button
                            className={`${styles.shareButton} ${styles.viber}`}
                            onClick={() => handleSocialShare('viber')}
                            aria-label="Share on Viber"
                        >
                            <span className={styles.shareIcon} aria-hidden="true"></span>
                            Viber
                        </button>

                        <button
                            className={`${styles.shareButton} ${styles.linkedin}`}
                            onClick={() => handleSocialShare('linkedin')}
                            aria-label="Share on LinkedIn"
                        >
                            <span className={styles.shareIcon} aria-hidden="true"></span>
                            LinkedIn
                        </button>

                        <button
                            className={`${styles.shareButton} ${styles.pinterest}`}
                            onClick={() => handleSocialShare('pinterest')}
                            aria-label="Share on Pinterest"
                        >
                            <span className={styles.shareIcon} aria-hidden="true"></span>
                            Pinterest
                        </button>

                        <button
                            className={`${styles.shareButton} ${styles.email}`}
                            onClick={() => handleSocialShare('email')}
                            aria-label="Share via Email"
                        >
                            <span className={styles.shareIcon} aria-hidden="true"></span>
                            Email
                        </button>
                    </div>

                    <div className={styles.copyLinkSection}>
                        <button
                            className={getCopyButtonClass()}
                            onClick={handleCopyLink}
                            disabled={copyStatus === 'copying'}
                            aria-label="Copy link and details to clipboard"
                        >
                            {getCopyButtonText()}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdvertisementCard = ({
    advertisement,
    isAdmin = false,
    onEdit,
    onDelete
}) => {
    const [showShareModal, setShowShareModal] = useState(false);

    const handleCardClick = (e) => {
        // Don't navigate if clicking admin actions or share button
        if (e.target.closest('.admin-actions') || e.target.closest('.share-button')) {
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

    const handleShare = (e) => {
        e.stopPropagation();
        setShowShareModal(true);
    };

    return (
        <>
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

                    <div className={styles.advertisementActions}>
                        <div className={styles.advertisementUrl}>
                            View Details ( पूरा विवरण हेर्नुहोस् )  →
                        </div>

                        <button
                            className={`${styles.shareButton} share-button`}
                            onClick={handleShare}
                            title="Share this advertisement"
                        >
                        </button>
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

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                advertisement={advertisement}
            />
        </>
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
            <h1 className={styles.advertisementsTitle}>विज्ञापन</h1>
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
export { AdvertisementCard, AdvertisementModal, ShareModal };

// Export the main manager component as default
export default AdvertisementManager;
