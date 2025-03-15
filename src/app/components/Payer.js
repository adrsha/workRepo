import { useState } from 'react';
import styles from '../../styles/Payer.module.css';

export default function Payer(props) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const classId = props.classId;
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

    const formData = new FormData();
    formData.append('screenshot', file);
    formData.append('class_id', classId);


    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`File uploaded successfully!`);
      } else {
        setError(data.error || 'An error occurred during upload.');
      }
    } catch (err) {
      setError('An error occurred while uploading the file.');
      console.error(err);
    }
  };

  function handleClose() {
    props.onClose();
  }
  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3>Payment for Room {props.classId}</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="screenshot">Upload Screenshot:</label>
            <input
              type="file"
              id="screenshot"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
          </div>
          <button type="submit">Upload</button>
          <button className={styles.closeButton} onClick={handleClose}> Cancel </button>
        </form>
        {message && <p className={styles.success}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
