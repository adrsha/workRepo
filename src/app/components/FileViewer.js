import { useState, useEffect, useCallback } from 'react';
import styles from './innerStyles/FileViewer.module.css';

// Constants
const FILE_ICONS = {
    pdf     : '📄',
    image   : '🖼️',
    text    : '📝',
    word    : '📘',
    folder  : '📁',
    default : '📎'
};

const FILE_EXTENSIONS = {
    image       : ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    text        : ['txt'],
    document    : ['doc', 'docx'],
    pdf         : ['pdf']
};

// Utility functions
const fileUtils = {
    getFileUrl(path) {
        if (!path) return '';
        return path.startsWith('/') ? path : `/${path}`;
    },

    getFileIcon(item) {
        if (item.type === 'directory') return FILE_ICONS.folder;

        const extension = item.name?.split('.').pop()?.toLowerCase();
        
        if (extension === 'pdf') return FILE_ICONS.pdf;
        if (FILE_EXTENSIONS.image.includes(extension)) return FILE_ICONS.image;
        if (FILE_EXTENSIONS.text.includes(extension)) return FILE_ICONS.text;
        if (FILE_EXTENSIONS.document.includes(extension)) return FILE_ICONS.word;
        
        return FILE_ICONS.default;
    },

    getFileExtension(fileName) {
        return fileName?.split('.').pop()?.toLowerCase();
    },

    isImageFile(fileName) {
        const extension = this.getFileExtension(fileName);
        return FILE_EXTENSIONS.image.includes(extension);
    },

    formatFileSize(size) {
        if (!size) return '';
        
        if (size === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(size) / Math.log(k));
        
        return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// Custom hooks
const useFileValidation = () => {
    const checkFileExists = useCallback(async (path) => {
        try {
            const fileUrl = fileUtils.getFileUrl(path);
            const response = await fetch(fileUrl, { method: 'HEAD' });

            if (response.ok) {
                const extension = fileUtils.getFileExtension(path);
                return { 
                    exists      : true, 
                    fileType    : extension 
                };
            }
            
            return { 
                exists  : false, 
                error   : `File not found: ${path}` 
            };
        } catch (err) {
            return { 
                exists  : false, 
                error   : `Unable to access file: ${path}` 
            };
        }
    }, []);

    return { checkFileExists };
};

const useFileManager = () => {
    const [availableItems, setAvailableItems] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [currentPath, setCurrentPath] = useState('');
    const [error, setError] = useState(null);

    const fetchDirectoryContents = useCallback(async (directory = '') => {
        setLoadingFiles(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/files/list?directory=${encodeURIComponent(directory)}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch directory contents');
            }

            const data = await response.json();
            setAvailableItems(data.items || []);
            setCurrentPath(directory);
        } catch (error) {
            console.error('Error fetching directory contents:', error);
            setError(error.message);
            setAvailableItems([]);
        } finally {
            setLoadingFiles(false);
        }
    }, []);

    const navigateToDirectory = useCallback((directoryPath) => {
        fetchDirectoryContents(directoryPath);
    }, [fetchDirectoryContents]);

    const navigateUp = useCallback(() => {
        const parentPath = currentPath.split('/').slice(0, -1).join('/');
        fetchDirectoryContents(parentPath);
    }, [currentPath, fetchDirectoryContents]);

    return {
        availableItems,
        loadingFiles,
        currentPath,
        error,
        fetchDirectoryContents,
        navigateToDirectory,
        navigateUp
    };
};

// Components
const LoadingSpinner = () => (
    <div className={styles.container}>
        <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading file...</p>
        </div>
    </div>
);

const ErrorDisplay = ({ error, allowFileChange, onShowFileBrowser }) => (
    <div className={styles.container}>
        <div className={styles.error}>
            <div className={styles.icon}>⚠️</div>
            <h4>File Not Found</h4>
            <p>{error}</p>
            {allowFileChange && (
                <button
                    className={`${styles.actionBtn} ${styles.primary}`}
                    onClick={onShowFileBrowser}
                    style={{ marginTop: '12px' }}
                >
                    Select a Different File
                </button>
            )}
        </div>
    </div>
);

const FileActions = ({ fileType, fileUrl, allowFileChange, onShowFileBrowser }) => (
    <div className={styles.actions}>
        {allowFileChange && (
            <button className={styles.actionBtn} onClick={onShowFileBrowser}>
                Change File
            </button>
        )}
        <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionBtn}
        >
            {fileType === 'pdf' ? 'Open in New Tab' : 'View Full Size'}
        </a>
        <a href={fileUrl} download className={styles.actionBtn}>
            Download
        </a>
    </div>
);

const Breadcrumb = ({ currentPath, onNavigate }) => {
    if (!currentPath) return null;

    const pathParts = currentPath.split('/').filter(Boolean);

    return (
        <div className={styles.breadcrumb}>
            <button
                className={styles.breadcrumbItem}
                onClick={() => onNavigate('')}
            >
                🏠 uploads
            </button>
            {pathParts.map((part, index) => {
                const path = pathParts.slice(0, index + 1).join('/');
                return (
                    <span key={path}>
                        <span className={styles.breadcrumbSeparator}>/</span>
                        <button
                            className={styles.breadcrumbItem}
                            onClick={() => onNavigate(path)}
                        >
                            {part}
                        </button>
                    </span>
                );
            })}
        </div>
    );
};

const FilePreview = ({ item, onLoad, onError }) => {
    if (item.type === 'directory') {
        return (
            <div className={styles.filePreviewPlaceholder}>
                <div className={styles.fileIcon}>{FILE_ICONS.folder}</div>
            </div>
        );
    }

    const fileUrl = fileUtils.getFileUrl(item.publicPath);
    const isImage = fileUtils.isImageFile(item.name);

    if (isImage) {
        return (
            <img
                src={fileUrl}
                alt={item.name}
                className={styles.filePreview}
                onLoad={onLoad}
                onError={onError}
            />
        );
    }

    return (
        <div className={styles.filePreviewPlaceholder}>
            <div className={styles.fileIcon}>{fileUtils.getFileIcon(item)}</div>
        </div>
    );
};

const FileItem = ({ item, onSelect, onNavigate }) => {
    const handleClick = () => {
        if (item.type === 'directory') {
            onNavigate(item.path);
        } else {
            onSelect(item);
        }
    };

    const fileSize = item.type !== 'directory' 
        ? fileUtils.formatFileSize(item.rawSize || item.size) 
        : null;

    return (
        <div className={styles.fileItem} onClick={handleClick}>
            <div className={styles.filePreviewContainer}>
                <FilePreview
                    item={item}
                    onLoad={() => {}}
                    onError={() => {}}
                />
            </div>
            <div className={styles.fileInfo}>
                <div className={styles.fileName}>
                    {item.name}
                    {item.type === 'directory' && ' /'}
                </div>
                <div className={styles.fileDetails}>
                    {item.type === 'directory' 
                        ? 'Folder' 
                        : `${fileSize || ''} • ${fileUtils.getFileExtension(item.name)?.toUpperCase() || 'File'}`
                    }
                </div>
            </div>
        </div>
    );
};

const FileBrowser = ({
    show,
    onClose,
    availableItems,
    loadingFiles,
    currentPath,
    error,
    onFileSelect,
    onNavigate,
    onNavigateUp
}) => {
    if (!show) return null;

    return (
        <div className={styles.fileBrowserOverlay}>
            <div className={styles.fileBrowserModal}>
                <div className={styles.fileBrowserHeader}>
                    <h3>Select a File</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.navigationBar}>
                    <Breadcrumb currentPath={currentPath} onNavigate={onNavigate} />
                    {currentPath && (
                        <button className={styles.upButton} onClick={onNavigateUp}>
                            ↩️ Back
                        </button>
                    )}
                </div>

                <div className={styles.fileBrowserContent}>
                    {error ? (
                        <div className={styles.error}>
                            <p>Error: {error}</p>
                        </div>
                    ) : loadingFiles ? (
                        <div className={styles.loadingFiles}>Loading...</div>
                    ) : availableItems.length === 0 ? (
                        <div className={styles.noFiles}>No items found</div>
                    ) : (
                        <div className={styles.fileList}>
                            {availableItems.map((item, index) => (
                                <FileItem
                                    key={`${item.type}-${item.name}-${index}`}
                                    item={item}
                                    onSelect={onFileSelect}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const FileContent = ({ 
    fileType, 
    currentFilePath, 
    onLoad, 
    onError, 
    allowFileChange, 
    onShowFileBrowser 
}) => {
    const fileUrl = fileUtils.getFileUrl(currentFilePath);

    const renderPlaceholder = (icon, title, description) => (
        <div className={styles.placeholder}>
            <div className={styles.icon}>{icon}</div>
            <h4>{title}</h4>
            <p>{description}</p>
        </div>
    );

    const renderWithActions = (content) => (
        <>
            {content}
            <FileActions
                fileType={fileType}
                fileUrl={fileUrl}
                allowFileChange={allowFileChange}
                onShowFileBrowser={onShowFileBrowser}
            />
        </>
    );

    switch (fileType) {
        case 'pdf':
            return (
                <div className={styles.pdfContainer}>
                    {renderWithActions(
                        <iframe
                            src={fileUrl}
                            className={styles.pdf}
                            title="PDF Preview"
                            onLoad={onLoad}
                            onError={onError}
                        />
                    )}
                </div>
            );

        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
            return (
                <div className={styles.imageContainer}>
                    {renderWithActions(
                        <img
                            src={fileUrl}
                            alt="File preview"
                            className={styles.image}
                            onLoad={onLoad}
                            onError={onError}
                        />
                    )}
                </div>
            );

        case 'txt':
            return (
                <div className={styles.textContainer}>
                    {renderWithActions(
                        <iframe
                            src={fileUrl}
                            className={styles.text}
                            title="Text Preview"
                            onLoad={onLoad}
                            onError={onError}
                        />
                    )}
                </div>
            );

        case 'doc':
        case 'docx':
            return (
                <div className={styles.documentContainer}>
                    {renderWithActions(
                        renderPlaceholder('📄', 'Word Document', 'Preview not available for this file type')
                    )}
                </div>
            );

        default:
            return (
                <div className={styles.unknownContainer}>
                    {renderWithActions(
                        renderPlaceholder(
                            '📎', 
                            `File (${fileType?.toUpperCase() || 'Unknown'})`, 
                            'Preview not available for this file type'
                        )
                    )}
                </div>
            );
    }
};

// Main component
const FileViewer = ({
    filePath,
    onFileChange,
    allowFileChange = false,
    onFilePathUpdate
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentFilePath, setCurrentFilePath] = useState(filePath);
    const [fileType, setFileType] = useState(null);
    const [showFileBrowser, setShowFileBrowser] = useState(false);

    const { checkFileExists } = useFileValidation();
    const {
        availableItems,
        loadingFiles,
        currentPath,
        error: fileManagerError,
        fetchDirectoryContents,
        navigateToDirectory,
        navigateUp
    } = useFileManager();

    useEffect(() => {
        setCurrentFilePath(filePath);
    }, [filePath]);

    useEffect(() => {
        if (!currentFilePath) {
            setError('No file path provided');
            setLoading(false);
            return;
        }

        const validateFile = async () => {
            setLoading(true);
            setError(null);

            const result = await checkFileExists(currentFilePath);

            if (result.exists) {
                setFileType(result.fileType);
            } else {
                setError(result.error);
            }

            setLoading(false);
        };

        validateFile();
    }, [currentFilePath, checkFileExists]);

    const handleShowFileBrowser = () => {
        setShowFileBrowser(true);
        setError(null);
        fetchDirectoryContents('');
    };

    const handleFileSelect = async (selectedFile) => {
        setShowFileBrowser(false);
        setLoading(true);
        setError(null);

        const newFilePath = selectedFile.publicPath;
        setCurrentFilePath(newFilePath);

        if (onFileChange) {
            onFileChange(newFilePath);
        }

        if (onFilePathUpdate) {
            try {
                await onFilePathUpdate(newFilePath);
            } catch (error) {
                console.error('Error updating file path:', error);
                setError('Failed to update file path in database');
            }
        }
    };

    const handleLoad = () => setLoading(false);
    const handleError = () => {
        setError(`Failed to load ${fileType}`);
        setLoading(false);
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <>
                <ErrorDisplay
                    error={error}
                    allowFileChange={allowFileChange}
                    onShowFileBrowser={handleShowFileBrowser}
                />
                <FileBrowser
                    show={showFileBrowser}
                    onClose={() => setShowFileBrowser(false)}
                    availableItems={availableItems}
                    loadingFiles={loadingFiles}
                    currentPath={currentPath}
                    error={fileManagerError}
                    onFileSelect={handleFileSelect}
                    onNavigate={navigateToDirectory}
                    onNavigateUp={navigateUp}
                />
            </>
        );
    }

    return (
        <div className={styles.container}>
            <FileContent
                fileType={fileType}
                currentFilePath={currentFilePath}
                onLoad={handleLoad}
                onError={handleError}
                allowFileChange={allowFileChange}
                onShowFileBrowser={handleShowFileBrowser}
            />
            <FileBrowser
                show={showFileBrowser}
                onClose={() => setShowFileBrowser(false)}
                availableItems={availableItems}
                loadingFiles={loadingFiles}
                currentPath={currentPath}
                error={fileManagerError}
                onFileSelect={handleFileSelect}
                onNavigate={navigateToDirectory}
                onNavigateUp={navigateUp}
            />
        </div>
    );
};

export default FileViewer;
