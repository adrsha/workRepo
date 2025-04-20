import { useState, useEffect } from 'react';
import styles from '../../styles/Payer.module.css';

export default function Payer(props) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const cart = Array.isArray(props.cart) ? props.cart : [];

  const getTeacher = (teacherId) => {
    console.log(props.teachersData)
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
        console.log(response);
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

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3>Payment for Selected Classes</h3>

        {/* Display selected classes */}
        <div className={styles.selectedClasses}>
          <h4>Selected Classes:</h4>
          {selectedClasses.length > 0 ? (
            <div className={styles.classesList}>
              {selectedClasses.map(cls => (
                <div key={cls.class_id} className={styles.classItem}>
                  {console.log(cls)}
                  <span>{cls.course_name || 'Class'} - {cls.grade_name} from {cls.start_time} to {cls.end_time} guided by {getTeacher(cls.teacher_id)?.user_name}</span>
                </div>
              ))}
              <div className={styles.totalRow}>
                <span>Total Classes:</span>
                <span className={styles.totalItems}>{selectedClasses.length}</span>
              </div>
            </div>
          ) : (
            <p>Loading class details...</p>
          )}
        </div>

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
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>
        </form>

        {message && <p className={styles.success}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
