import { useState, useEffect } from 'react';
import styles from '../../styles/ContentPayer.module.css';

const PAYMENT_METHODS = {
    QR:     'qr',
    BANK:   'bank',
    ESEWA:  'esewa'
};

const CONTENT_ICONS = {
    file:    '📎',
    text:    '📄',
    default: '📋'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ContentPayer({ 
    contentItems = [], 
    onSuccess, 
    onClose, 
    entityType = 'content',
    entityId 
}) {
    const [file,                setFile]                = useState(null);
    const [message,             setMessage]             = useState('');
    const [error,               setError]               = useState('');
    const [selectedContent,     setSelectedContent]     = useState([]);
    const [isSubmitting,        setIsSubmitting]        = useState(false);
    const [qrImg,               setQrImg]               = useState('esewa.png');
    const [showQrPayment,       setShowQrPayment]       = useState(false);
    const [showPaymentOptions,  setShowPaymentOptions]  = useState(false);

    useEffect(() => {
        if (contentItems?.length > 0) {
            setSelectedContent(contentItems);
        }
    }, [contentItems]);

    const validateFile = (selectedFile) => {
        if (!selectedFile) {
            setError('Please select a payment screenshot to upload.');
            return false;
        }

        if (selectedFile.size > MAX_FILE_SIZE) {
            setError('File size must be less than 5MB.');
            return false;
        }

        if (!selectedFile.type.startsWith('image/')) {
            setError('Please select an image file.');
            return false;
        }

        return true;
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
        setError('');
        
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                console.log('Payment screenshot loaded for preview');
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const processPaymentForContent = async (item, formFile) => {
        const formData = new FormData();
        formData.append('screenshot',  formFile);
        formData.append('content_id',  item.content_id);
        formData.append('entity_type', entityType);
        formData.append('entity_id',   entityId);
        formData.append('amount',      item.price);

        const response = await fetch('/api/contentPayment', {
            method: 'POST',
            body:   formData,
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Payment processing failed');
        }

        return response.json();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        setMessage('');
        setError('');
        setIsSubmitting(true);

        if (!validateFile(file)) {
            setIsSubmitting(false);
            return;
        }

        try {
            // Process payments sequentially to avoid overwhelming the server
            for (const item of selectedContent) {
                await processPaymentForContent(item, file);
            }

            setMessage('Payment uploaded successfully for all content!');
            setShowQrPayment(false);
            
            setTimeout(() => {
                onSuccess?.();
                onClose?.();
            }, 1500);

        } catch (err) {
            setError(err.message || 'An error occurred while processing the payment.');
            console.error('Payment processing error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = (e) => {
        e?.preventDefault();
        onClose?.();
    };

    const handlePaymentMethodSelect = (method) => {
        if (method === PAYMENT_METHODS.QR) {
            setShowPaymentOptions(false);
            setShowQrPayment(true);
        }
    };

    const getContentTitle = (item) => {
        try {
            const data = JSON.parse(item.content_data || '{}');
            return data.title || 
                   (data.text?.substring(0, 30) + '...') || 
                   'Untitled Content';
        } catch {
            return 'Content Item';
        }
    };

    const getContentIcon = (contentType) => {
        return CONTENT_ICONS[contentType] || CONTENT_ICONS.default;
    };

    const totalCost     = selectedContent.reduce((total, item) => total + parseFloat(item.price || 0), 0);
    const hasValidItems = selectedContent.length > 0 && totalCost > 0;

    if (showQrPayment) {
        return (
            <div className={styles.modal}>
                <div className={styles.qrImgPayment}>
                    <div className={styles.qrHeader}>
                        <h4>Payment via QR Code</h4>
                        <p>Total Amount: <strong>Rs. {totalCost.toFixed(2)}</strong></p>
                    </div>
                    
                    <img 
                        src={qrImg} 
                        alt="Payment QR Code" 
                        className={styles.qrImage}
                    />
                    
                    <form onSubmit={handleSubmit}>
                        <div className={styles.uploadSection}>
                            <label htmlFor="screenshot">
                                Upload Payment Screenshot: 
                                <span className={styles.fileInfo}>(PNG/JPG format, max 5MB)</span>
                            </label>
                            <input
                                type="file"
                                id="screenshot"
                                accept="image/*"
                                onChange={handleFileChange}
                                required
                                disabled={isSubmitting}
                            />
                            {file && (
                                <div className={styles.filePreview}>
                                    <span className={styles.fileName}>
                                        Selected: {file.name}
                                    </span>
                                    <span className={styles.fileSize}>
                                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className={styles.buttonGroup}>
                            <button 
                                type="submit" 
                                className={styles.submitButton}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Processing...' : 'Submit Payment'}
                            </button>
                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() => setShowQrPayment(false)}
                                disabled={isSubmitting}
                            >
                                Return
                            </button>
                        </div>
                    </form>
                    
                    {message && (
                        <div className={styles.successMessage}>
                            <span className={styles.successIcon}>✓</span>
                            {message}
                        </div>
                    )}
                    
                    {error && (
                        <div className={styles.errorMessage}>
                            <span className={styles.errorIcon}>⚠</span>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modal}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>Payment for Selected Content</h3>
                    <button 
                        className={styles.closeButtonX}
                        onClick={handleClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>
                
                <div className={styles.selectedClasses}>
                    <h4>Selected Content:</h4>
                    {hasValidItems ? (
                        <div className={styles.classesList}>
                            {selectedContent.map(item => (
                                <ContentItem 
                                    key={item.content_id}
                                    item={item}
                                    getContentTitle={getContentTitle}
                                    getContentIcon={getContentIcon}
                                />
                            ))}
                            
                            <div className={styles.totalRow}>
                                <div className={styles.totalInfo}>
                                    <span className={styles.totalLabel}>
                                        Total Items: <strong>{selectedContent.length}</strong>
                                    </span>
                                    <span className={styles.totalCost}>
                                        Total Cost: <strong>Rs. {totalCost.toFixed(2)}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.loadingState}>
                            <p>No content items selected for payment.</p>
                        </div>
                    )}
                </div>
                
                <button 
                    id={styles.payNowButton} 
                    className={styles.submitButton} 
                    onClick={() => setShowPaymentOptions(true)}
                    disabled={!hasValidItems}
                >
                    Pay Now - Rs. {totalCost.toFixed(2)}
                </button>
                
                {showPaymentOptions && (
                    <PaymentOptions 
                        onMethodSelect={handlePaymentMethodSelect}
                        styles={styles}
                    />
                )}
                
                {message && (
                    <div className={styles.successMessage}>
                        <span className={styles.successIcon}>✓</span>
                        {message}
                    </div>
                )}
                
                {error && (
                    <div className={styles.errorMessage}>
                        <span className={styles.errorIcon}>⚠</span>
                        {error}
                    </div>
                )}
                
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={handleClose}
                >
                    Close
                </button>
            </div>
        </div>
    );
}

// Extracted components for better organization
function ContentItem({ item, getContentTitle, getContentIcon }) {
    return (
        <div className={styles.classItem}>
            <div className={styles.classHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>
                        {getContentIcon(item.content_type)}
                    </span>
                    <h4 className={styles.classTitle}>
                        {getContentTitle(item)}
                    </h4>
                </div>
                <span className={styles.cost}>
                    Rs. {parseFloat(item.price || 0).toFixed(2)}
                </span>
            </div>
            <div className={styles.classDetails}>
                <span className={styles.grade}>
                    <strong>Type:</strong> {item.content_type}
                </span>
                <span className={styles.time}>
                    <strong>Added:</strong> {new Date(item.created_at).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
}

function PaymentOptions({ onMethodSelect, styles }) {
    return (
        <div className={styles.payOptions}>
            <h4>Choose Payment Method:</h4>
            <div className={styles.paymentButtons}>
                <button 
                    className={styles.hoverableButtons} 
                    onClick={() => onMethodSelect(PAYMENT_METHODS.QR)}
                >
                    QR Code
                </button>
                <button 
                    className={styles.hoverableButtons}
                    disabled
                >
                    Bank (Coming Soon)
                </button>
                <button 
                    className={styles.hoverableButtons}
                    disabled
                >
                    Esewa (Coming Soon)
                </button>
            </div>
        </div>
    );
}
