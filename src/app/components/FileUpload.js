'use client';
import { useState, useCallback } from 'react';
import styles from "../../styles/ClassContent.module.css";

// Configuration presets with aligned key-value pairs

const UPLOAD_PRESETS = {
    carousel: {
        accept          : 'image/*',
        allowedTypes    : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        labels          : {
            upload  : 'Drop image here or click to upload',
            button  : 'Upload Image',
            success : 'Image uploaded successfully'
        },
        resetAfterUpload    : true,
        validateFileType    : true
    },
    classes: {
        accept          : undefined,
        allowedTypes    : null,
        labels          : {
            upload  : 'Drop file here or click to upload',
            button  : 'Upload File',
            success : 'File uploaded successfully'
        },
        resetAfterUpload    : false,
        validateFileType    : false
    },
    advertisements: {
        accept          : 'image/*',
        allowedTypes    : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        labels          : {
            upload  : 'Drop advertisement image here or click to upload',
            button  : 'Upload Advertisement Image',
            success : 'Advertisement image uploaded successfully'
        },
        resetAfterUpload    : false,
        validateFileType    : true
    },
    signup: {
        accept          : '.pdf,.jpg,.jpeg,.png',
        allowedTypes    : ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
        labels          : {
            upload  : 'Drop certificate here or click to upload',
            button  : 'Upload Certificate',
            success : 'Certificate uploaded successfully'
        },
        resetAfterUpload    : false,
        validateFileType    : true
    }
};

// Utility functions
const formatFileSize = (bytes) => Math.round(bytes / 1024);

const validateFileType = (file, allowedTypes) => {
    if (!allowedTypes) return { isValid: true };

    const isValid = allowedTypes.includes(file.type);
    if (!isValid) {
        const typeNames = allowedTypes
            .map(type => type.split('/')[1]?.toUpperCase() || type)
            .join(', ');
        return {
            isValid : false,
            error   : `Only ${typeNames} files are allowed`
        };
    }

    return { isValid: true };
};

// Custom hooks
const useDragAndDrop = () => {
    const [dragActive, setDragActive] = useState(false);

    const handleDragEvent = useCallback((e, isDragOver = false) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(isDragOver);
    }, []);

    const handleDrop = useCallback((e, onFileDrop) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            onFileDrop(droppedFile);
        }
    }, []);

    return {
        dragActive,
        onDragEnter : (e) => handleDragEvent(e, true),
        onDragLeave : (e) => handleDragEvent(e, false),
        onDragOver  : (e) => handleDragEvent(e, true),
        onDrop      : handleDrop
    };
};

const useFileUpload = (config, callbacks) => {
    const [file, setFile]                       = useState(null);
    const [isUploading, setIsUploading]         = useState(false);
    const [uploadError, setUploadError]         = useState(null);
    const [uploadedFilePath, setUploadedFilePath] = useState('');

    const resetFile = useCallback(async () => {
        // If there's an uploaded file, delete it from server
        if (uploadedFilePath) {
            try {
                const response = await fetch('/api/upload', {
                    method  : 'DELETE',
                    headers : {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ filePath: uploadedFilePath }),
                });

                if (!response.ok) {
                    console.error('Failed to delete file from server');
                }
            } catch (error) {
                console.error('Error deleting file:', error);
            }
        }

        // Clear local state
        setFile(null);
        setUploadError(null);
        setUploadedFilePath('');
        
        // Clear file input
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
    }, [uploadedFilePath]);

    const handleFileSelection = useCallback((selectedFile) => {
        setUploadError(null);

        if (config.validateFileType) {
            const validation = validateFileType(selectedFile, config.allowedTypes);
            if (!validation.isValid) {
                setUploadError(validation.error);
                return;
            }
        }

        setFile(selectedFile);

        if (callbacks.onFileUpload) {
            callbacks.onFileUpload({ file: selectedFile, name: selectedFile.name });
        }
    }, [config.validateFileType, config.allowedTypes, callbacks.onFileUpload]);

    const uploadFile = useCallback(async (uploadParams) => {
        if (!file) {
            setUploadError('File is required');
            return;
        }

        if (!uploadParams.isSignUpForm && !uploadParams.parentId) {
            setUploadError('Parent ID is required');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parentId', uploadParams.parentId);
            formData.append('parentType', uploadParams.parentType);
            formData.append('isSignupForm', uploadParams.isSignUpForm.toString());

            const response = await fetch('/api/upload', {
                method  : 'POST',
                body    : formData,
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Upload failed');
            }

            const result = await response.json();
            setUploadedFilePath(result.filePath || result.path);

            const enrichedResult = { ...result, originalName: file.name };

            if (callbacks.onUploadComplete) {
                callbacks.onUploadComplete(enrichedResult);
            }
            if (callbacks.onFileUpload) {
                callbacks.onFileUpload({ ...enrichedResult, file });
            }

            if (config.resetAfterUpload) {
                resetFile();
            }

        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [file, config.resetAfterUpload, callbacks, resetFile]);

    return {
        file,
        isUploading,
        uploadError,
        uploadedFilePath,
        resetFile,
        handleFileSelection,
        uploadFile
    };
};

// Components
const FileInfo = ({ file }) => (
    <div className={styles.fileInfo}>
        <span className={styles.fileName}>{file.name}</span>
        <span className={styles.fileSize}>({formatFileSize(file.size)} KB)</span>
    </div>
);

const UploadLabel = ({ label }) => (
    <label htmlFor="file-upload" className={styles.uploadLabel}>
        <span>{label}</span>
    </label>
);

const UploadActions = ({
    onUpload,
    onCancel,
    isUploading,
    buttonText,
    showCancel = true
}) => (
    <div className={styles.uploadActions}>
        <button
            type="button"
            className={styles.uploadButton}
            onClick={onUpload}
            disabled={isUploading}
        >
            {isUploading ? 'Uploading...' : buttonText}
        </button>
        {showCancel && (
            <button
                type="button"
                className={styles.cancelButton}
                onClick={onCancel}
                disabled={isUploading}
            >
                {buttonText.includes('Certificate') ? 'Remove' : 'Cancel'}
            </button>
        )}
    </div>
);

const ErrorMessage = ({ error }) => (
    <div className={styles.errorMessage}>
        {error}
    </div>
);

const SuccessMessage = ({ message }) => (
    <div className={styles.successMessage}>
        ✓ {message}
    </div>
);

const HiddenInput = ({ name, value }) => (
    <input type="hidden" name={name} value={value} />
);

// Main component
export default function FileUpload({
    // Core props
    parentId,
    parentType = 'classes',
    onUploadComplete,
    onFileUpload,
    hiddenInputName,

    // Backward compatibility
    isSignUpForm = false,

    // Custom configuration (overrides presets)
    accept,
    allowedTypes,
    uploadLabel,
    uploadButtonText,
    successMessage,
    resetAfterUpload,
    validateFileType,
    showUploadActions = true,
    showCancelButton = true
}) {
    // Get configuration - now consistent for all paths
    const getConfig = () => {
        // Get base preset
        let preset;
        if (isSignUpForm) {
            preset = UPLOAD_PRESETS.signup;
        } else {
            preset = UPLOAD_PRESETS[parentType] || UPLOAD_PRESETS.classes;
        }

        // Always return consistent structure with nested labels
        return {
            accept              : accept ?? preset.accept,
            allowedTypes        : allowedTypes ?? preset.allowedTypes,
            labels              : {
                upload  : uploadLabel ?? preset.labels.upload,
                button  : uploadButtonText ?? preset.labels.button,
                success : successMessage ?? preset.labels.success
            },
            resetAfterUpload    : resetAfterUpload ?? preset.resetAfterUpload,
            validateFileType    : validateFileType ?? preset.validateFileType
        };
    };

    const config = getConfig();
    const callbacks = { onUploadComplete, onFileUpload };

    const dragProps = useDragAndDrop();
    const {
        file,
        isUploading,
        uploadError,
        uploadedFilePath,
        resetFile,
        handleFileSelection,
        uploadFile
    } = useFileUpload(config, callbacks);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelection(selectedFile);
        }
    };

    const handleFileDrop = (droppedFile) => {
        handleFileSelection(droppedFile);
    };

    const handleUpload = () => {
        uploadFile({
            parentId,
            parentType,
            isSignUpForm
        });
    };

    const shouldShowUploadActions = showUploadActions && file;

    return (
        <div className={styles.fileUploadContainer}>
            <div
                className={`${styles.dropzone} ${dragProps.dragActive ? styles.active : ''} ${file ? styles.hasFile : ''}`}
                onDragEnter={dragProps.onDragEnter}
                onDragLeave={dragProps.onDragLeave}
                onDragOver={dragProps.onDragOver}
                onDrop={(e) => dragProps.onDrop(e, handleFileDrop)}
            >
                <input
                    type="file"
                    id="file-upload"
                    className={styles.fileInput}
                    onChange={handleFileChange}
                    disabled={isUploading}
                    accept={config.accept}
                />
                
                {file ? (
                    <FileInfo file={file} />
                ) : (
                    <UploadLabel label={config.labels.upload} />
                )}
            </div>

            {uploadError && <ErrorMessage error={uploadError} />}
            {shouldShowUploadActions && (
                <UploadActions
                    onUpload={handleUpload}
                    onCancel={resetFile}
                    isUploading={isUploading}
                    buttonText={config.labels.button}
                    showCancel={showCancelButton}
                />
            )}

            {hiddenInputName && uploadedFilePath && (
                <HiddenInput name={hiddenInputName} value={uploadedFilePath} />
            )}

            {uploadedFilePath && (
                <SuccessMessage message={config.labels.success} />
            )}
        </div>
    );
}
