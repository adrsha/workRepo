import { useState, useEffect, useCallback } from 'react';
import styles from './innerStyles/FileViewer.module.css';

// Constants
const FILE_ICONS = {
    pdf: '📄',
    image: '🖼️',
    text: '📝',
    word: '📘',
    folder: '📁',
    default: '📎'
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const TEXT_EXTENSIONS = ['txt'];
const DOCUMENT_EXTENSIONS = ['doc', 'docx'];

// Utility functions
const getFileUrl = (path) => {
    if (!path) return '';
    return path.startsWith('/uploads/') ? path : `/uploads/${path}`;
};

const getFileIcon = (item) => {
    if (item.type === 'directory') return FILE_ICONS.folder;

    const fileType = item.name?.split('.').pop()?.toLowerCase();
    if (fileType === 'pdf') return FILE_ICONS.pdf;
    if (IMAGE_EXTENSIONS.includes(fileType)) return FILE_ICONS.image;
    if (TEXT_EXTENSIONS.includes(fileType)) return FILE_ICONS.text;
    if (DOCUMENT_EXTENSIONS.includes(fileType)) return FILE_ICONS.word;
    return FILE_ICONS.default;
};

const isImageFile = (fileType) => IMAGE_EXTENSIONS.includes(fileType?.toLowerCase());

// Custom hooks
const useFileValidation = () => {
    const checkFileExists = useCallback(async (path) => {
        try {
            const fileUrl = getFileUrl(path);
            const response = await fetch(fileUrl, { method: 'HEAD' });

            if (response.ok) {
                const extension = path.split('.').pop()?.toLowerCase();
                return { exists: true, fileType: extension };
            }
            return { exists: false, error: `File not found: ${path}` };
        } catch (err) {
            return { exists: false, error: `Unable to access file: ${path}` };
        }
    }, []);

    return { checkFileExists };
};

const useFileManager = () => {
    const [availableItems, setAvailableItems] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [currentPath, setCurrentPath] = useState('');

    const fetchDirectoryContents = useCallback(async (directory = '') => {
        setLoadingFiles(true);
        try {
            const response = await fetch(`/api/files/list?directory=${encodeURIComponent(directory)}`);
            if (!response.ok) throw new Error('Failed to fetch directory contents');

            const data = await response.json();
            setAvailableItems(data.items || data.files || []);
            setCurrentPath(directory);
        } catch (error) {
            console.error('Error fetching directory contents:', error);
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
                🏠 Root
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

    const fileUrl = getFileUrl(item.path);
    const extension = item.name?.split('.').pop()?.toLowerCase();

    if (isImageFile(extension)) {
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
            <div className={styles.fileIcon}>{getFileIcon(item)}</div>
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

    return (
        <div className={styles.fileItem} onClick={handleClick}>
            <div className={styles.filePreviewContainer}>
                <FilePreview
                    item={item}
                    onLoad={() => { }}
                    onError={() => { }}
                />
            </div>
            <div className={styles.fileInfo}>
                <div className={styles.fileName}>
                    {item.name}
                    {item.type === 'directory' && ' /'}
                </div>
                <div className={styles.fileDetails}>
                    {item.type === 'directory' ? 'Folder' : `${item.size || ''} • ${item.type || 'File'}`}
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
                    {loadingFiles ? (
                        <div className={styles.loadingFiles}>Loading...</div>
                    ) : availableItems.length === 0 ? (
                        <div className={styles.noFiles}>No items found</div>
                    ) : (
                        <div className={styles.fileList}>
                            {availableItems.map((item, index) => (
                                <FileItem
                                    key={index}
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

const FileContent = ({ fileType, currentFilePath, onLoad, onError, allowFileChange, onShowFileBrowser }) => {
    const fileUrl = getFileUrl(currentFilePath);

    const renderPlaceholder = (icon, title, description) => (
        <div className={styles.placeholder}>
            <div className={styles.icon}>{icon}</div>
            <h4>{title}</h4>
            <p>{description}</p>
        </div>
    );

    switch (fileType) {
        case 'pdf':
            return (
                <div className={styles.pdfContainer}>
                    <iframe
                        src={fileUrl}
                        className={styles.pdf}
                        title="PDF Preview"
                        onLoad={onLoad}
                        onError={onError}
                    />
                    <FileActions
                        fileType={fileType}
                        fileUrl={fileUrl}
                        allowFileChange={allowFileChange}
                        onShowFileBrowser={onShowFileBrowser}
                    />
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
                        onLoad={onLoad}
                        onError={onError}
                    />
                    <FileActions
                        fileType={fileType}
                        fileUrl={fileUrl}
                        allowFileChange={allowFileChange}
                        onShowFileBrowser={onShowFileBrowser}
                    />
                </div>
            );

        case 'txt':
            return (
                <div className={styles.textContainer}>
                    <iframe
                        src={fileUrl}
                        className={styles.text}
                        title="Text Preview"
                        onLoad={onLoad}
                        onError={onError}
                    />
                    <FileActions
                        fileType={fileType}
                        fileUrl={fileUrl}
                        allowFileChange={allowFileChange}
                        onShowFileBrowser={onShowFileBrowser}
                    />
                </div>
            );

        case 'doc':
        case 'docx':
            return (
                <div className={styles.documentContainer}>
                    {renderPlaceholder('📄', 'Word Document', 'Preview not available for this file type')}
                    <FileActions
                        fileType={fileType}
                        fileUrl={fileUrl}
                        allowFileChange={allowFileChange}
                        onShowFileBrowser={onShowFileBrowser}
                    />
                </div>
            );

        default:
            return (
                <div className={styles.unknownContainer}>
                    {renderPlaceholder('📎', `File (${fileType?.toUpperCase() || 'Unknown'})`, 'Preview not available for this file type')}
                    <FileActions
                        fileType={fileType}
                        fileUrl={fileUrl}
                        allowFileChange={allowFileChange}
                        onShowFileBrowser={onShowFileBrowser}
                    />
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

        const newFilePath = selectedFile.path;
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
                onFileSelect={handleFileSelect}
                onNavigate={navigateToDirectory}
                onNavigateUp={navigateUp}
            />
        </div>
    );
};

export default FileViewer;
