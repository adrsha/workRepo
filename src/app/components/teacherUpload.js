"use client";
import { useState, useRef } from 'react';
import styles from "../../styles/teacherVideos.module.css";

const TeacherVideoUpload = ({ onUploadSuccess, currentVideoUrl = null, customUserId = null }) => {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
        const maxSize = 50 * 1024 * 1024; // 50MB
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid video format. Only MP4, WebM, MOV, and AVI are allowed.');
        }
        
        if (file.size > maxSize) {
            throw new Error('Video file too large. Maximum size is 50MB.');
        }
    };

    const handleFiles = (files) => {
        const file = files[0];
        if (!file) return;

        try {
            validateFile(file);
            setSelectedFile(file);
            setError('');
        } catch (err) {
            setError(err.message);
            setSelectedFile(null);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const uploadVideo = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            const formData = new FormData();
            formData.append('video', selectedFile);
            
            if (customUserId) {
                formData.append('targetUserId', customUserId);
            }

            const response = await fetch('/api/teacherUpload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            setSuccess('Video uploaded successfully!');
            setSelectedFile(null);
            onUploadSuccess?.(result);
            
        } catch (err) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const clearSelection = () => {
        setSelectedFile(null);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Upload Teaching Video</h3>
                <p className={styles.subtitle}>Share your teaching expertise with students</p>
            </div>

            {currentVideoUrl && (
                <div className={styles.currentVideo}>
                    <p className={styles.currentVideoLabel}>Current video:</p>
                    <video 
                        src={currentVideoUrl} 
                        className={styles.videoPreview}
                        controls
                    />
                </div>
            )}

            <div
                className={`${styles.dropZone} ${dragActive ? styles.dragZoneActive : ''} ${selectedFile ? styles.dragZoneSelected : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/mov,video/avi"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                />

                {selectedFile ? (
                    <div className={styles.selectedFile}>
                        <div className={styles.selectedFileHeader}>
                            <VideoIcon />
                            <button
                                onClick={clearSelection}
                                className={styles.clearButton}
                            >
                                <CloseIcon />
                            </button>
                        </div>
                        <div className={styles.fileInfo}>
                            <p className={styles.fileName}>{selectedFile.name}</p>
                            <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
                        </div>
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <UploadIcon />
                        <div className={styles.emptyStateText}>
                            <p className={styles.dropText}>Drop your video here or click to browse</p>
                            <p className={styles.formatText}>MP4, WebM, MOV, AVI (max 50MB)</p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className={styles.errorMessage}>
                    <AlertIcon />
                    <p className={styles.errorText}>{error}</p>
                </div>
            )}

            {success && (
                <div className={styles.successMessage}>
                    <CheckIcon />
                    <p className={styles.successText}>{success}</p>
                </div>
            )}

            {selectedFile && (
                <button
                    onClick={uploadVideo}
                    disabled={uploading}
                    className={`${styles.uploadButton} ${uploading ? styles.uploadButtonDisabled : ''}`}
                >
                    {uploading ? 'Uploading...' : 'Upload Video'}
                </button>
            )}
        </div>
    );
};

// Custom SVG Icons
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0l-8 8h5v8h6v-8h5l-8-8zm0 24c-6.627 0-12-5.373-12 h2c0 5.523 4.477 10 10 10s10-4.477 10-10h2c0 6.627-5.373 12-12 12z"/>
    </svg>
);

const VideoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 8v8l5-4-5-4zm-8 4a10 10 0 1 0 20 0 10 10 0 1 0-20 0z"/>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 19l-7-7 1.41-1.41L9 16.17l12.59-12.59L22 5l-13 13z"/>
    </svg>
);

const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm1 17h-2v-2h2v2zm0-4h-2v-6h2v6z"/>
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 10.586l4.293-4.293 1.414 1.414L13.414 12l4.293 4.293-1.414 1.414L12 13.414l-4.293 4.293-1.414-1.414L10.586 12 6.293 7.707 7.707 6.293 12 10.586z"/>
    </svg>
);

export default TeacherVideoUpload;
