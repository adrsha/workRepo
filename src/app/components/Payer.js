import { useState, useEffect } from 'react';
import styles from '../../styles/Payer.module.css';

export default function Payer(props) {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const cart = Array.isArray(props.cart) ? props.cart : [];
    const [qrImg, setQrImg] = useState('esewa.png');

    const getTeacher = (teacherId) => {
        return props.teachersData?.find(teacher => teacher.user_id === teacherId);
    };

    // Get selected classes from the cart passed from parent component
    useEffect(() => {
        if (props.classesData && cart.length > 0) {
            // Filter classes that are in the cart
            const classesInCart = props.classesData.filter(cls =>
                cart.includes(cls.class_id)
            );
            setSelectedClasses(classesInCart);
        }
    }, [props.classesData, cart]);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
        setError(''); // Clear any previous errors
        
        // Optional: Show file preview for images
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // You could set a preview state here if needed
                console.log('File loaded for preview');
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');
        setIsSubmitting(true);

        if (!file) {
            setError('Please select a file to upload.');
            setIsSubmitting(false);
            return;
        }

        // File size validation (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB.');
            setIsSubmitting(false);
            return;
        }

        try {
            // Process each class in the cart
            for (const classId of cart) {
                const formData = new FormData();
                formData.append('screenshot', file);
                formData.append('class_id', classId);

                // Use your existing payment API
                const response = await fetch('/api/payment', {
                    method: 'POST',
                    body: formData,
                });
                
                // Check if there was an error
                if (!response.ok) {
                    const data = await response.json();
                    setError(data.error || 'An error occurred during upload.');
                    setIsSubmitting(false);
                    return;
                }
            }

            // All payments successful
            setMessage('Payment uploaded successfully for all classes!');
            
            // Close the QR payment popup
            toggleVisibility("qr_img_payment");
            
            // Trigger success callback after short delay and close main modal
            setTimeout(() => {
                if (props.onSuccess) {
                    props.onSuccess();
                }
                // Close the entire payment modal
                if (props.onClose) {
                    props.onClose();
                }
            }, 1500);
        } catch (err) {
            setError('An error occurred while uploading the payment.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Function to handle close button click
    const handleClose = (e) => {
        e.preventDefault();
        if (props.onClose) {
            props.onClose();
        }
    };

    // Enhanced toggle function with better error handling
    function toggleVisibility(className) {
        const elements = document.getElementsByClassName(className);
        if (elements.length === 0) return; // Safety check

        // Assume all have same visibility; check the first one
        const currentDisplay = window.getComputedStyle(elements[0]).display;
        const newDisplay = currentDisplay === "none" ? "block" : "none";

        [...elements].forEach(el => {
            el.style.display = newDisplay;
        });

        console.log(`Toggled ${className} to: ${newDisplay}`);
    }

    const handlePaymentMethodSelect = (method) => {
        toggleVisibility("qr_img_payment");
    };

    const totalCost = selectedClasses.reduce((total, cls) => total + cls.cost, 0);

    return (
        <div className={styles.modal}>
            <div className={`${styles.qrImgPayment} qr_img_payment`} style={{display:'none'}}>
                <div className={styles.qrHeader}>
                    <h4>Payment via QR Code</h4>
                    <p>Total Amount: <strong>Rs. {totalCost}</strong></p>
                </div>
                <img src={qrImg} alt="Payment QR Code" className={styles.qrImage}/>
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
                                <span className={styles.fileName}>Selected: {file.name}</span>
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
                            onClick={() => toggleVisibility("qr_img_payment")}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
            
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>Payment for Selected Classes</h3>
                    <button 
                        className={styles.closeButtonX}
                        onClick={handleClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>
                
                {/* Display selected classes */}
                <div className={styles.selectedClasses}>
                    <h4>Selected Classes:</h4>
                    {selectedClasses.length > 0 ? (
                        <div className={styles.classesList}>
                            {selectedClasses.map(cls => {
                                const teacher = getTeacher(cls.teacher_id);
                                return (
                                    <div key={cls.class_id} className={styles.classItem}>
                                        <div className={styles.classHeader}>
                                            <h4 className={styles.classTitle}>{cls.course_name || 'Class'}</h4>
                                            <span className={styles.cost}>Rs. {cls.cost}</span>
                                        </div>
                                        <div className={styles.classDetails}>
                                            <span className={styles.grade}>{cls.grade_name}</span>
                                            <span className={styles.time}>
                                                <strong>Time:</strong> {cls.start_time} - {cls.end_time}
                                            </span>
                                            <span className={styles.teacher}>
                                                <strong>Teacher:</strong> {teacher?.user_name || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className={styles.totalRow}>
                                <div className={styles.totalInfo}>
                                    <span className={styles.totalLabel}>Total Classes: <strong>{selectedClasses.length}</strong></span>
                                    <span className={styles.totalCost}>Total Cost: <strong>Rs. {totalCost}</strong></span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.loadingState}>
                            <p>Loading class details...</p>
                        </div>
                    )}
                </div>
                
                <button 
                    id={styles.payNowButton} 
                    className={styles.submitButton} 
                    onClick={() => toggleVisibility("payOptionsId")}
                    disabled={selectedClasses.length === 0}
                >
                    Pay Now - Rs. {totalCost}
                </button>
                
                <div className={`${styles.payOptions} payOptionsId`} style={{display:'none'}}>
                    <h4>Choose Payment Method:</h4>
                    <div className={styles.paymentButtons}>
                        <button 
                            className={styles.hoverableButtons} 
                            onClick={() => handlePaymentMethodSelect('qr')}
                        >
                            QR Code
                        </button>
                        <button 
                            className={styles.hoverableButtons}
                            // onClick={() => handlePaymentMethodSelect('bank')}
                        >
                            Bank
                        </button>
                        <button 
                            className={styles.hoverableButtons}
                            // onClick={() => handlePaymentMethodSelect('esewa')}
                        >
                            Esewa
                        </button>
                    </div>
                </div>
                
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
                    Cancel
                </button>
            </div>
        </div>
    );
}
