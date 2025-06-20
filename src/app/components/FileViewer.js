import { useState, useEffect } from 'react';
import styles from './innerStyles/FileViewer.module.css';

const FileViewer = ( {filePath} ) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fileType, setFileType] = useState(null);

    useEffect(() => {
        if (!filePath) {
            setError('No file path provided');
            setLoading(false);
            return;
        }
        // Determine file type from extension
        const extension = filePath.split('.').pop()?.toLowerCase();
        setFileType(extension);
        setLoading(false);
    }, [filePath]);

    const getFileUrl = () => {
        // Handle both absolute and relative paths
        if (filePath.startsWith('/uploads/')) {
            return filePath; // Already has the correct public path
        }
        return `/uploads/${filePath}`;
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
                                setError('Failed to load PDF');
                                setLoading(false);
                            }}
                        />
                        <div className={styles.actions}>
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
                        {console.log(fileUrl)}
                        <img
                            src={fileUrl}
                            alt="File preview"
                            className={styles.image}
                            onLoad={() => setLoading(false)}
                            onError={() => {
                                setError('Failed to load image');
                                setLoading(false);
                            }}
                        />
                        <div className={styles.actions}>
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
                                setError('Failed to load text file');
                                setLoading(false);
                            }}
                        />
                        <div className={styles.actions}>
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

    if (error) {
        return (
            <div className={`${styles.container} `}>
                <div className={styles.error}>
                    <div className={styles.icon}>⚠️</div>
                    <h4>Error Loading File</h4>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.container} `}>
            {renderFileContent()}
        </div>
    );
};

export default FileViewer;
