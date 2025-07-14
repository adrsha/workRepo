'use client';
import { useState } from 'react';
import styles from "../../styles/ClassContent.module.css";

// Configuration presets for different use cases
const FILE_UPLOAD_PRESETS = {
    carousel: {
        accept: 'image/*',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        uploadLabel: 'Drop image here or click to upload',
        uploadButtonText: 'Upload Image',
        successMessage: 'Image uploaded successfully',
        resetAfterUpload: true,
        validateFileType: true
    },
    classes: {
        accept: undefined,
        allowedTypes: null,
        uploadLabel: 'Drop file here or click to upload',
        uploadButtonText: 'Upload File',
        successMessage: 'File uploaded successfully',
        resetAfterUpload: false,
        validateFileType: false
    },
    signup: {
        accept: '.pdf,.jpg,.jpeg,.png',
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
        uploadLabel: 'Drop certificate here or click to upload',
        uploadButtonText: 'Upload Certificate',
        successMessage: 'Certificate uploaded successfully',
        resetAfterUpload: false,
        validateFileType: true
    }
};

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

const UploadLabel = ({ label }) => (
    <label htmlFor="file-upload" className={styles.uploadLabel}>
        <span>{label}</span>
    </label>
);

const UploadActions = ({ onUpload, onCancel, isUploading, uploadButtonText, showCancel = true }) => (
    <div className={styles.uploadActions}>
        <button
            type="button"
            className={styles.uploadButton}
            onClick={onUpload}
            disabled={isUploading}
        >
            {isUploading ? 'Uploading...' : uploadButtonText}
        </button>
        {showCancel && (
            <button
                type="button"
                className={styles.cancelButton}
                onClick={onCancel}
                disabled={isUploading}
            >
                {uploadButtonText.includes('Certificate') ? 'Remove' : 'Cancel'}
            </button>
        )}
    </div>
);

export default function FileUpload({ 
    // Core props
    parentId,
    parentType = 'classes', 
    onUploadComplete, 
    onFileUpload,
    hiddenInputName,
    
    // Backward compatibility props
    isSignUpForm = false,
    
    // Custom configuration props (override presets)
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
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadedFilePath, setUploadedFilePath] = useState('');

    // Determine configuration based on props
    const getConfig = () => {
        // Handle backward compatibility
        if (isSignUpForm) {
            return FILE_UPLOAD_PRESETS.signup;
        }
        
        // Use preset if available, otherwise use default
        const preset = FILE_UPLOAD_PRESETS[parentType] || FILE_UPLOAD_PRESETS.classes;
        
        // Allow custom props to override preset values
        return {
            accept: accept ?? preset.accept,
            allowedTypes: allowedTypes ?? preset.allowedTypes,
            uploadLabel: uploadLabel ?? preset.uploadLabel,
            uploadButtonText: uploadButtonText ?? preset.uploadButtonText,
            successMessage: successMessage ?? preset.successMessage,
            resetAfterUpload: resetAfterUpload ?? preset.resetAfterUpload,
            validateFileType: validateFileType ?? preset.validateFileType
        };
    };

    const config = getConfig();

    const resetFile = () => {
        setFile(null);
        setUploadError(null);
        setUploadedFilePath('');
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
    };

    const validateFile = (selectedFile) => {
        if (!config.validateFileType || !config.allowedTypes) {
            return { isValid: true, error: null };
        }

        const isValidType = config.allowedTypes.includes(selectedFile.type);
        if (!isValidType) {
            const fileTypeNames = config.allowedTypes
                .map(type => type.split('/')[1]?.toUpperCase() || type)
                .join(', ');
            return {
                isValid: false,
                error: `Only ${fileTypeNames} files are allowed`
            };
        }

        return { isValid: true, error: null };
    };

    const handleFileChange = (e) => {
        setUploadError(null);
        if (e.target.files?.[0]) {
            const selectedFile = e.target.files[0];
            
            // Validate file type if required
            const validation = validateFile(selectedFile);
            if (!validation.isValid) {
                setUploadError(validation.error);
                return;
            }
            
            setFile(selectedFile);
            
            // For signup form or when onFileUpload is provided, notify parent
            if (onFileUpload) {
                onFileUpload({ file: selectedFile, name: selectedFile.name });
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setUploadError('File is required');
            return;
        }
        
        if (!isSignUpForm && !parentId) {
            setUploadError('Parent ID is required');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parentId', parentId);
            formData.append('parentType', parentType);
            formData.append('isSignupForm', isSignUpForm.toString());
            
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
            
            // Add original name metadata
            result.originalName = file.name;
            
            // Call the appropriate callback
            if (onUploadComplete) {
                onUploadComplete(result);
            }
            if (onFileUpload) {
                onFileUpload({...result, file});
            }

            // Reset file after successful upload if configured
            if (config.resetAfterUpload) {
                resetFile();
            }

        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const shouldShowUploadActions = showUploadActions && file && (!isSignUpForm || isSignUpForm);

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
                    accept={config.accept}
                />

                {file ? <FileInfo file={file} /> : <UploadLabel label={config.uploadLabel} />}
            </div>

            {uploadError && (
                <div className={styles.errorMessage}>
                    {uploadError}
                </div>
            )}

            {shouldShowUploadActions && (
                <UploadActions
                    onUpload={handleUpload}
                    onCancel={resetFile}
                    isUploading={isUploading}
                    uploadButtonText={config.uploadButtonText}
                    showCancel={showCancelButton}
                />
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
                    ✓ {config.successMessage}
                </div>
            )}
        </div>
    );
}
