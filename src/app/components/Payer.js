import { useState, useEffect } from 'react';
import styles from '../../styles/Payer.module.css';

export default function Payer(props) {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
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
        setFile(event.target.files[0]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');

        if (!file) {
            setError('Please select a file to upload.');
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
                    return;
                }
            }

            // All payments successful
            setMessage('Payment uploaded successfully for all classes!');

            // Trigger success callback after short delay
            setTimeout(() => {
                if (props.onSuccess) {
                    props.onSuccess();
                }
            }, 1500);
        } catch (err) {
            setError('An error occurred while uploading the payment.');
            console.error(err);
        }
    };

    // Function to handle close button click
    const handleClose = (e) => {
        e.preventDefault();
        if (props.onClose) {
            props.onClose();
        }
    };

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

    return (
        <div className={styles.modal}>
                <div className={`${styles.qrImgPayment} qr_img_payment`} style={{display:'none'}}>
                    <img src={qrImg} alt="Pay Details"/>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.uploadSection}>
                            <label htmlFor="screenshot">Upload Payment Screenshot: (PNG/JPG format)</label>
                            <input
                                type="file"
                                id="screenshot"
                                accept="image/*"
                                onChange={handleFileChange}
                                required
                            />
                        </div>
                        <div className={styles.buttonGroup}>
                            <button type="submit" className={styles.submitButton}>Submit</button>
                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() => toggleVisibility("qr_img_payment")}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            <div className={styles.modalContent}>
                <h3>Payment for Selected Classes</h3>
                {/* Display selected classes */}
                <div className={styles.selectedClasses}>
                    <h4>Selected Classes:</h4>
                    {selectedClasses.length > 0 ? (
                        <div className={styles.classesList}>
                            {selectedClasses.map(cls => {
                                const teacher = getTeacher(cls.teacher_id);
                                return (
                                    <div key={cls.class_id} className={styles.classItem}>
                                        <div>
                                            <span className={styles.cost}>Cost: {cls.cost}</span>
                                            <span className={styles.grade}>{cls.grade_name}</span>
                                        </div>
                                        <div className={styles.classHeader}>
                                            <h4 className={styles.classTitle}>{cls.course_name || 'Class'}</h4>
                                        </div>
                                        <div className={styles.classDetails}>
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
                                <span>Total Classes:</span>
                                <span className={styles.totalItems}>{selectedClasses.length}</span>
                                <span>Total Cost:</span>
                                <span className={styles.totalCost}>
                                    {selectedClasses.reduce((total, cls) => total + cls.cost, 0)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p>Loading class details...</p>
                    )}
                </div>
                <button id ={styles.payNowButton} className={styles.submitButton} onClick={() => toggleVisibility("payOptionsId")}>Pay Now</button>
                <div className={`${styles.payOptions} payOptionsId`}>
                    <button className={styles.hoverableButtons} onClick={() => toggleVisibility( "qr_img_payment")}>QR Code</button>
                    <button className={styles.hoverableButtons}>Bank</button>
                    <button className={styles.hoverableButtons}>Esewa</button>
                </div>
                {message && <p className={styles.success}>{message}</p>}
                {error && <p className={styles.error}>{error}</p>}
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
