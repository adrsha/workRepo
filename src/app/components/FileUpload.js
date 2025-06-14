import { useState } from 'react';
import styles from "../../styles/ClassContent.module.css";

const DragHandlers = {
    handleDrag: (e, setDragActive) => {
        e.preventDefault();
        e.stopPropagation();

        const isDragEnter = e.type === "dragenter" || e.type === "dragover";
        setDragActive(isDragEnter);
    },

    handleDrop: (e, setDragActive, setFile, setUploadError) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        setUploadError(null);

        if (e.dataTransfer.files?.[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    }
};

const FileInfo = ({ file }) => (
    <div className={styles.fileInfo}>
        <span className={styles.fileName}>{file.name}</span>
        <span className={styles.fileSize}>({Math.round(file.size / 1024)} KB)</span>
    </div>
);

const UploadLabel = () => (
    <label htmlFor="file-upload" className={styles.uploadLabel}>
        <span>Drop file here or click to upload</span>
    </label>
);

const UploadActions = ({ onUpload, onCancel, isUploading }) => (
    <div className={styles.uploadActions}>
        <button
            className={styles.uploadButton}
            onClick={onUpload}
            disabled={isUploading}
        >
            {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
        <button
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isUploading}
        >
            Cancel
        </button>
    </div>
);

export default function FileUpload({ classId, onUploadComplete }) {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const resetFile = () => {
        setFile(null);
        setUploadError(null);
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleFileChange = (e) => {
        setUploadError(null);
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !classId) {
            setUploadError('File and class ID are required');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('classId', classId);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Upload failed');
            }

            const result = await response.json();
            onUploadComplete?.(result);
            resetFile();

        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={styles.fileUploadContainer}>
            <div
                className={`${styles.dropzone} ${dragActive ? styles.active : ''} ${file ? styles.hasFile : ''}`}
                onDragEnter={(e) => DragHandlers.handleDrag(e, setDragActive)}
                onDragLeave={(e) => DragHandlers.handleDrag(e, setDragActive)}
                onDragOver={(e) => DragHandlers.handleDrag(e, setDragActive)}
                onDrop={(e) => DragHandlers.handleDrop(e, setDragActive, setFile, setUploadError)}
            >
                <input
                    type="file"
                    id="file-upload"
                    className={styles.fileInput}
                    onChange={handleFileChange}
                    disabled={isUploading}
                />

                {file ? <FileInfo file={file} /> : <UploadLabel />}
            </div>

            {uploadError && (
                <div className={styles.errorMessage}>
                    {uploadError}
                </div>
            )}

            {file && (
                <UploadActions
                    onUpload={handleUpload}
                    onCancel={resetFile}
                    isUploading={isUploading}
                />
            )}
        </div>
    );
}


