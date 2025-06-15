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
            type="button"
            className={styles.uploadButton}
            onClick={onUpload}
            disabled={isUploading}
        >
            {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
        <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isUploading}
        >
            Cancel
        </button>
    </div>
);

export default function FileUpload({ 
    classId, 
    onUploadComplete, 
    onFileUpload, // For signup form compatibility
    isSignUpForm = false,
    hiddenInputName
}) {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadedFilePath, setUploadedFilePath] = useState('');

    const resetFile = () => {
        setFile(null);
        setUploadError(null);
        setUploadedFilePath('');
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleFileChange = (e) => {
        setUploadError(null);
        if (e.target.files?.[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            
            // For signup form, just notify parent that file is selected
            if (isSignUpForm && onFileUpload) {
                onFileUpload({ file: selectedFile, name: selectedFile.name });
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setUploadError('File is required');
            return;
        }
        
        if (!isSignUpForm && !classId) {
            setUploadError('Class ID is required');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('classId', classId); // Always send classId
            formData.append('isSignupForm', isSignUpForm.toString()); // Send signup form flag
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Upload failed');
            }

            const result = await response.json();
            setUploadedFilePath(result.filePath || result.path);
            
            // Call the appropriate callback
            if (onUploadComplete) {
                onUploadComplete(result);
            }
            if (onFileUpload) {
                onFileUpload({...result, file});
            }

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
                    accept={isSignUpForm ? ".pdf,.jpg,.jpeg,.png" : undefined}
                />

                {file ? <FileInfo file={file} /> : <UploadLabel />}
            </div>

            {uploadError && (
                <div className={styles.errorMessage}>
                    {uploadError}
                </div>
            )}

            {file && !isSignUpForm && (
                <UploadActions
                    onUpload={handleUpload}
                    onCancel={resetFile}
                    isUploading={isUploading}
                />
            )}

            {file && isSignUpForm && (
                <div className={styles.uploadActions}>
                    <button
                        type="button"
                        className={styles.uploadButton}
                        onClick={handleUpload}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Uploading...' : 'Upload Certificate'}
                    </button>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={resetFile}
                        disabled={isUploading}
                    >
                        Remove
                    </button>
                </div>
            )}

            {/* Hidden input for form submission */}
            {hiddenInputName && uploadedFilePath && (
                <input 
                    type="hidden" 
                    name={hiddenInputName} 
                    value={uploadedFilePath} 
                />
            )}

            {uploadedFilePath && (
                <div className={styles.successMessage}>
                    ✓ File uploaded successfully
                </div>
            )}
        </div>
    );
}
