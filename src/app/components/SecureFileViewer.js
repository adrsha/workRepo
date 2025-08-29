'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import styles from '../../styles/SecureFileViewer.module.css';

// Utility functions
const createFileUrl = (blob) => URL.createObjectURL(blob);
const cleanupFileUrl = (url) => url && URL.revokeObjectURL(url);
const isImage = (type) => type?.startsWith('image/');
const isPdf = (type) => type?.includes('pdf');

const parseContentData = (data) => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch {
            return {};
        }
    }
    return data || {};
};

const fetchFile = async (contentId, token, isPublic = false) => {
    const headers = {};
    
    // Only add auth header if not public or if token exists
    if (!isPublic && token) {
        headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(`/api/secureFile/${contentId}${isPublic ? '?public=true' : ''}`, {
        headers
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Failed to fetch file: ${response.status}`);
    }

    return response.blob();
};

// Loading component
const Loading = () => (
    <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading secure content...</p>
    </div>
);

// Error component
const ErrorMessage = ({ error, onRetry }) => (
    <div className={styles.error}>
        <div className={styles.errorIcon}>⚠️</div>
        <p>{error}</p>
        {onRetry && (
            <button className={styles.retryButton} onClick={onRetry} type="button">
                Retry
            </button>
        )}
    </div>
);

// Image viewer
const ImageViewer = ({ src }) => {
    const [hasError, setHasError] = useState(false);

    const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
    };

    const handleDragStart = (e) => {
        e.preventDefault();
        return false;
    };

    return (
        <div className={styles.imageViewer}>
            {hasError ? (
                <img
                    src={src}
                    alt="Secure file preview"
                    className={styles.image}
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                />
            ) : (
                <Image
                    src={src}
                    alt="Secure file preview"
                    fill
                    className={styles.image}
                    style={{ objectFit: 'contain' }}
                    onError={() => setHasError(true)}
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    priority
                    unoptimized
                />
            )}
        </div>
    );
};

// PDF viewer
const PdfViewer = ({ src }) => (
    <div className={styles.pdfViewer}>
        <iframe
            src={`${src}#toolbar=0&navpanes=0&scrollbar=0`}
            className={styles.pdfFrame}
            title="PDF Preview"
            onContextMenu={(e) => e.preventDefault()}
        />
    </div>
);

// Generic file viewer
const GenericViewer = ({ contentId, isPublic = false }) => {
    const handleOpenViewer = useCallback(() => {
        const publicParam = isPublic ? '?public=true' : '';
        window.open(`/viewer/${contentId}${publicParam}`, '_blank', 'noopener,noreferrer');
    }, [contentId, isPublic]);

    return (
        <div className={styles.genericViewer}>
            <div className={styles.fileIcon}>📄</div>
            <p>This file requires the secure viewer</p>
            <button
                className={styles.viewButton}
                onClick={handleOpenViewer}
                type="button"
            >
                Open Secure Viewer
            </button>
        </div>
    );
};

// Security overlay
const SecurityOverlay = ({ isPublic = false }) => (
    <>
        <div className={styles.watermark}>
            {isPublic ? '' : 'CONFIDENTIAL merotuition.com'}
        </div>
        <div className={styles.securityBar}>
            <span>{isPublic ? '🔓 Public Content' : '🔒 Protected Content'}</span>
        </div>
    </>
);

// Custom hook for file loading
const useSecureFile = (contentId, token, isPublic = false) => {
    const [fileUrl,   setFileUrl] = useState(null);
    const [loading,   setLoading] = useState(true);
    const [error,     setError]   = useState(null);

    const loadFile = useCallback(async () => {
        if (!contentId) {
            setError('Missing content ID');
            setLoading(false);
            return;
        }

        // For non-public content, require token
        if (!isPublic && !token) {
            setError('Missing access token');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const blob = await fetchFile(contentId, token, isPublic);
            const url  = createFileUrl(blob);
            setFileUrl(url);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [contentId, token, isPublic]);

    useEffect(() => {
        loadFile();

        return () => {
            if (fileUrl) {
                cleanupFileUrl(fileUrl);
            }
        };
    }, [loadFile]);

    return { fileUrl, loading, error, retry: loadFile };
};

// Main component
export default function SecureFileViewer({ content, className, allowPublicAccess = false }) {
    const { content_id, content_data } = content;
    const { fileType } = parseContentData(content_data);

    const { data: session, status }         = useSession();
    const { fileUrl, loading, error, retry } = useSecureFile(
        content_id, 
        session?.accessToken, 
        allowPublicAccess
    );

    // Disable print for this component (only for non-public content)
    useEffect(() => {
        if (allowPublicAccess) return;

        const handleBeforePrint = (e) => {
            e.preventDefault();
            return false;
        };

        const handleKeyDown = (e) => {
            // Disable common screenshot shortcuts
            if (e.key === 'PrintScreen' || 
                (e.ctrlKey && e.shiftKey && e.key === 'S') ||
                (e.ctrlKey && e.key === 'p')) {
                e.preventDefault();
                return false;
            }
        };

        window.addEventListener('beforeprint', handleBeforePrint);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('beforeprint', handleBeforePrint);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [allowPublicAccess]);

    if (status === 'loading' && !allowPublicAccess) {
        return (
            <div className={styles.container}>
                <Loading />
            </div>
        );
    }

    if (status === 'unauthenticated' && !allowPublicAccess) {
        return (
            <div className={styles.container}>
                <ErrorMessage error="Authentication required to view this file" />
            </div>
        );
    }

    const renderFileViewer = () => {
        if (!fileUrl) return null;

        if (isImage(fileType)) {
            return <ImageViewer src={fileUrl} />;
        }

        if (isPdf(fileType)) {
            return <PdfViewer src={fileUrl} />;
        }

        return <GenericViewer contentId={content_id} isPublic={allowPublicAccess} />;
    };

    return (
        <div className={styles.container}>
            {loading && <Loading />}
            {error && <ErrorMessage error={error} onRetry={retry} />}
            {!loading && !error && (
                <div className={styles.viewer}>
                    {renderFileViewer()}
                </div>
            )}
            <SecurityOverlay isPublic={allowPublicAccess} />
        </div>
    );
}
