'use client';
import { useState } from 'react';
import styles from '../../styles/FileUpload.module.css';

export default function FileUpload({ onFileUpload }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      onFileUpload(file);
      setFile(null);
    }
  };

  return (
    <div className={styles.fileUploadContainer}>
      <div
        className={`${styles.dropzone} ${dragActive ? styles.active : ''} ${file ? styles.hasFile : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className={styles.fileInput}
          onChange={handleFileChange}
        />

        {file ? (
          <div className={styles.fileInfo}>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>({Math.round(file.size / 1024)} KB)</span>
          </div>
        ) : (
          <label htmlFor="file-upload" className={styles.uploadLabel}>
            <span>Drop file here or click to upload</span>
          </label>
        )}
      </div>

      {file && (
        <div className={styles.uploadActions}>
          <button
            className={styles.uploadButton}
            onClick={handleUpload}
          >
            Upload File
          </button>
          <button
            className={styles.cancelButton}
            onClick={() => setFile(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
