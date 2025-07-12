import { useState, useEffect } from 'react';
import styles from './innerStyles/FileViewer.module.css';

const FileViewer = ({ filePath, onFileChange, allowFileChange = false }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [showFileBrowser, setShowFileBrowser] = useState(false);
    const [availableFiles, setAvailableFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [selectedDirectory, setSelectedDirectory] = useState('');
    const [fileExists, setFileExists] = useState(false);

    useEffect(() => {
        if (!filePath) {
            setError('No file path provided');
            setLoading(false);
            return;
        }
        
        // Check if file exists before determining type
        checkFileExists(filePath);
    }, [filePath]);

    const checkFileExists = async (path) => {
        try {
            const fileUrl = getFileUrl(path);
            const response = await fetch(fileUrl, { method: 'HEAD' });
            
            if (response.ok) {
                setFileExists(true);
                // Determine file type from extension
                const extension = path.split('.').pop()?.toLowerCase();
                setFileType(extension);
                setError(null);
            } else {
                setFileExists(false);
                setError(`File not found: ${path}`);
            }
        } catch (err) {
            setFileExists(false);
            setError(`Unable to access file: ${path}`);
        } finally {
            setLoading(false);
        }
    };

    const getFileUrl = (path = filePath) => {
        // Handle both absolute and relative paths
        if (path.startsWith('/uploads/')) {
            return path; // Already has the correct public path
        }
        return `/uploads/${path}`;
    };

    // Fetch available files from the uploads directory
    const fetchAvailableFiles = async (directory = '') => {
        setLoadingFiles(true);
        try {
            const response = await fetch(`/api/files/list?directory=${encodeURIComponent(directory)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }
            const data = await response.json();
            setAvailableFiles(data.files || []);
        } catch (error) {
            console.error('Error fetching files:', error);
            // Don't set the main error state here, just log it
            // The file browser will handle its own error display
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleShowFileBrowser = () => {
        setShowFileBrowser(true);
        // Don't let file existence errors interfere with file browser
        setError(null);
        fetchAvailableFiles(selectedDirectory);
    };

    const handleFileSelect = (selectedFile) => {
        setShowFileBrowser(false);
        setLoading(true);
        setError(null);
        setFileExists(false);
        
        if (onFileChange) {
            onFileChange(selectedFile.path);
        }
    };

    const handleDirectoryChange = (directory) => {
        setSelectedDirectory(directory);
        fetchAvailableFiles(directory);
    };

    const renderFileBrowser = () => {
        if (!showFileBrowser) return null;

        return (
            <div className={styles.fileBrowserOverlay}>
                <div className={styles.fileBrowserModal}>
                    <div className={styles.fileBrowserHeader}>
                        <h3>Select a File</h3>
                        <button 
                            className={styles.closeButton}
                            onClick={() => setShowFileBrowser(false)}
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className={styles.directorySelector}>
                        <label htmlFor="directory">Directory:</label>
                        <select 
                            id="directory"
                            value={selectedDirectory} 
                            onChange={(e) => handleDirectoryChange(e.target.value)}
                            className={styles.directorySelect}
                        >
                            <option value="">Root</option>
                            <option value="signup-certificates">Signup Certificates</option>
                            <option value="teacher-certificates">Teacher Certificates</option>
                            <option value="documents">Documents</option>
                            <option value="images">Images</option>
                        </select>
                    </div>

                    <div className={styles.fileBrowserContent}>
                        {loadingFiles ? (
                            <div className={styles.loadingFiles}>Loading files...</div>
                        ) : availableFiles.length === 0 ? (
                            <div className={styles.noFiles}>No files found in this directory</div>
                        ) : (
                            <div className={styles.fileList}>
                                {availableFiles.map((file, index) => (
                                    <div 
                                        key={index} 
                                        className={styles.fileItem}
                                        onClick={() => handleFileSelect(file)}
                                    >
                                        <div className={styles.fileIcon}>
                                            {getFileIcon(file.type)}
                                        </div>
                                        <div className={styles.fileInfo}>
                                            <div className={styles.fileName}>{file.name}</div>
                                            <div className={styles.fileDetails}>
                                                {file.size} • {file.type}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const getFileIcon = (fileType) => {
        const type = fileType?.toLowerCase();
        if (type?.includes('pdf')) return '📄';
        if (type?.includes('image')) return '🖼️';
        if (type?.includes('text')) return '📝';
        if (type?.includes('word')) return '📘';
        return '📎';
    };

    const renderFileContent = () => {
        const fileUrl = getFileUrl();

        switch (fileType) {
            case 'pdf':
                return (
                    <div className={styles.pdfContainer}>
                        <iframe
                            src={fileUrl}
                            className={styles.pdf}
                            title="PDF Preview"
                            onLoad={() => setLoading(false)}
                            onError={() => {
                                setError('Failed to load PDF - file may not exist or be corrupted');
                                setLoading(false);
                            }}
                        />
                        <div className={styles.actions}>
                            {allowFileChange && (
                                <button 
                                    className={styles.actionBtn}
                                    onClick={handleShowFileBrowser}
                                >
                                    Change File
                                </button>
                            )}
                            <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={styles.actionBtn}
                            >
                                Open in New Tab
                            </a>
                            <a 
                                href={fileUrl} 
                                download
                                className={styles.actionBtn}
                            >
                                Download
                            </a>
                        </div>
                    </div>
                );

            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
                return (
                    <div className={styles.imageContainer}>
                        <img
                            src={fileUrl}
                            alt="File preview"
                            className={styles.image}
                            onLoad={() => setLoading(false)}
                            onError={() => {
                                setError('Failed to load image - file may not exist or be corrupted');
                                setLoading(false);
                            }}
                        />
                        <div className={styles.actions}>
                            {allowFileChange && (
                                <button 
                                    className={styles.actionBtn}
                                    onClick={handleShowFileBrowser}
                                >
                                    Change File
                                </button>
                            )}
                            <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={styles.actionBtn}
                            >
                                View Full Size
                            </a>
                            <a 
                                href={fileUrl} 
                                download
                                className={styles.actionBtn}
                            >
                                Download
                            </a>
                        </div>
                    </div>
                );

            case 'doc':
            case 'docx':
                return (
                    <div className={styles.documentContainer}>
                        <div className={styles.placeholder}>
                            <div className={styles.icon}>📄</div>
                            <h4>Word Document</h4>
                            <p>Preview not available for this file type</p>
                        </div>
                        <div className={styles.actions}>
                            {allowFileChange && (
                                <button 
                                    className={styles.actionBtn}
                                    onClick={handleShowFileBrowser}
                                >
                                    Change File
                                </button>
                            )}
                            <a 
                                href={fileUrl} 
                                download
                                className={`${styles.actionBtn} ${styles.primary}`}
                            >
                                Download Document
                            </a>
                        </div>
                    </div>
                );

            case 'txt':
                return (
                    <div className={styles.textContainer}>
                        <iframe
                            src={fileUrl}
                            className={styles.text}
                            title="Text Preview"
                            onLoad={() => setLoading(false)}
                            onError={() => {
                                setError('Failed to load text file - file may not exist or be corrupted');
                                setLoading(false);
                            }}
                        />
                        <div className={styles.actions}>
                            {allowFileChange && (
                                <button 
                                    className={styles.actionBtn}
                                    onClick={handleShowFileBrowser}
                                >
                                    Change File
                                </button>
                            )}
                            <a 
                                href={fileUrl} 
                                download
                                className={styles.actionBtn}
                            >
                                Download
                            </a>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className={styles.unknownContainer}>
                        <div className={styles.placeholder}>
                            <div className={styles.icon}>📎</div>
                            <h4>File ({fileType?.toUpperCase() || 'Unknown'})</h4>
                            <p>Preview not available for this file type</p>
                        </div>
                        <div className={styles.actions}>
                            {allowFileChange && (
                                <button 
                                    className={styles.actionBtn}
                                    onClick={handleShowFileBrowser}
                                >
                                    Change File
                                </button>
                            )}
                            <a 
                                href={fileUrl} 
                                download
                                className={`${styles.actionBtn} ${styles.primary}`}
                            >
                                Download File
                            </a>
                        </div>
                    </div>
                );
        }
    };

    if (loading) {
        return (
            <div className={`${styles.container}`}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading file...</p>
                </div>
            </div>
        );
    }

    if (error || !fileExists) {
        return (
            <div className={`${styles.container}`}>
                <div className={styles.error}>
                    <div className={styles.icon}>⚠️</div>
                    <h4>File Not Found</h4>
                    <p>{error || 'The requested file could not be found.'}</p>
                    {allowFileChange && (
                        <button 
                            className={`${styles.actionBtn} ${styles.primary}`}
                            onClick={handleShowFileBrowser}
                            style={{ marginTop: '12px' }}
                        >
                            Select a Different File
                        </button>
                    )}
                </div>
                {renderFileBrowser()}
            </div>
        );
    }

    return (
        <div className={`${styles.container}`}>
            {fileExists ? renderFileContent() : null}
            {renderFileBrowser()}
        </div>
    );
};

export default FileViewer;
