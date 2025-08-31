'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import styles from '../../styles/SecureFileViewer.module.css';

// Utility functions
const createFileUrl    = (blob) => URL.createObjectURL(blob);
const cleanupFileUrl   = (url) => url && URL.revokeObjectURL(url);
const isImage          = (type) => type?.startsWith('image/');
const isPdf            = (type) => type?.includes('pdf');
const isMobile         = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator?.userAgent || '');

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
        <p className={styles.loadingText}>Loading secure content...</p>
    </div>
);

// Error component
const ErrorMessage = ({ error, onRetry }) => (
    <div className={styles.error}>
        <div className={styles.errorIcon}>⚠️</div>
        <p className={styles.errorText}>{error}</p>
        {onRetry && (
            <button className={styles.retryButton} onClick={onRetry} type="button">
                Retry
            </button>
        )}
    </div>
);

// Image viewer with mobile optimization
const ImageViewer = ({ src }) => {
    const [hasError,        setHasError]        = useState(false);
    const [imageLoaded,     setImageLoaded]     = useState(false);
    const [scale,           setScale]           = useState(1);
    const [position,        setPosition]        = useState({ x: 0, y: 0 });
    const [isDragging,      setIsDragging]      = useState(false);
    const [dragStart,       setDragStart]       = useState({ x: 0, y: 0 });
    const [lastTap,         setLastTap]         = useState(0);

    const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
    };

    const handleDragStart = (e) => {
        e.preventDefault();
        return false;
    };

    const handleImageLoad = () => {
        setImageLoaded(true);
        setHasError(false);
    };

    const handleImageError = () => {
        console.error('Image failed to load:', src);
        setHasError(true);
        setImageLoaded(false);
    };

    // Touch/Mouse handlers for zoom and pan
    const handleTouchStart = useCallback((e) => {
        // Always prevent default to stop page scrolling
        e.preventDefault();
        
        if (e.touches.length === 1) {
            const now = Date.now();
            const timeSinceLastTap = now - lastTap;
            
            if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
                // Double tap to zoom
                setScale(prevScale => prevScale === 1 ? 2.5 : 1);
                setPosition({ x: 0, y: 0 });
            } else {
                setIsDragging(true);
                setDragStart({
                    x: e.touches[0].clientX - position.x,
                    y: e.touches[0].clientY - position.y
                });
            }
            setLastTap(now);
        }
    }, [lastTap, position]);

    const handleTouchMove = useCallback((e) => {
        // Always prevent default to stop page scrolling
        e.preventDefault();
        
        if (isDragging && e.touches.length === 1) {
            setPosition({
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y
            });
        }
    }, [isDragging, dragStart]);

    const handleTouchEnd = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleWheel = useCallback((e) => {
        // Always prevent default to stop page scrolling
        e.preventDefault();
        
        if (!isMobile()) {
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setScale(prevScale => Math.max(0.5, Math.min(5, prevScale * delta)));
        }
    }, []);

    const handleMouseDown = useCallback((e) => {
        if (!isMobile() && e.button === 0) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    }, [position]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging && !isMobile() && scale > 1) {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    }, [isDragging, dragStart, scale]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    if (!src) {
        return (
            <div className={styles.error}>
                <p>No image source available</p>
            </div>
        );
    }

    return (
        <div className={styles.imageViewer}>
            <div className={styles.imageControls}>
                <button 
                    className={styles.controlButton} 
                    onClick={() => setScale(s => Math.min(5, s * 1.2))}
                    type="button"
                    aria-label="Zoom in"
                >
                    +
                </button>
                <button 
                    className={styles.controlButton} 
                    onClick={() => setScale(s => Math.max(0.5, s * 0.8))}
                    type="button"
                    aria-label="Zoom out"
                >
                    -
                </button>
                <button 
                    className={styles.controlButton} 
                    onClick={resetZoom}
                    type="button"
                    aria-label="Reset zoom"
                >
                    ↺
                </button>
            </div>
            
            {!imageLoaded && !hasError && (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p className={styles.loadingText}>Loading image...</p>
                </div>
            )}
            
            <div 
                className={styles.imageContainer}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {hasError ? (
                    <div className={styles.error}>
                        <div className={styles.errorIcon}>⚠️</div>
                        <p className={styles.errorText}>Failed to load image</p>
                        <button 
                            onClick={() => {
                                setHasError(false);
                                setImageLoaded(false);
                            }}
                            className={styles.retryButton}
                            type="button"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <img
                        src={src}
                        alt="Secure file preview"
                        className={styles.image}
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default'),
                            display: imageLoaded ? 'block' : 'none',
                            pointerEvents: scale > 1 ? 'auto' : 'none'
                        }}
                        onContextMenu={handleContextMenu}
                        onDragStart={handleDragStart}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                )}
            </div>
        </div>
    );
};

// PDF viewer with mobile optimization
const PdfViewer = ({ src }) => {
    const [useNativePdf, setUseNativePdf] = useState(false);

    useEffect(() => {
        // On mobile, prefer opening PDF in new tab for better experience
        if (isMobile()) {
            setUseNativePdf(true);
        }
    }, []);

    const openPdfNewTab = () => {
        window.open(src, '_blank', 'noopener,noreferrer');
    };

    if (useNativePdf) {
        return (
            <div className={styles.pdfViewerMobile}>
                <div className={styles.pdfIcon}>📄</div>
                <p className={styles.pdfMessage}>
                    PDF viewing works best in a new tab on mobile devices
                </p>
                <button
                    className={styles.openPdfButton}
                    onClick={openPdfNewTab}
                    type="button"
                >
                    Open PDF
                </button>
            </div>
        );
    }

    return (
        <div className={styles.pdfViewer}>
            <iframe
                src={`${src}#toolbar=0&navpanes=0&scrollbar=0`}
                className={styles.pdfFrame}
                title="PDF Preview"
                onContextMenu={(e) => e.preventDefault()}
            />
        </div>
    );
};

// Generic file viewer
const GenericViewer = ({ contentId, isPublic = false }) => {
    const handleOpenViewer = useCallback(() => {
        const publicParam = isPublic ? '?public=true' : '';
        const url = `/viewer/${contentId}${publicParam}`;
        
        if (isMobile()) {
            // On mobile, open in same tab for better UX
            window.location.href = url;
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }, [contentId, isPublic]);

    return (
        <div className={styles.genericViewer}>
            <div className={styles.fileIcon}>📄</div>
            <p className={styles.genericMessage}>This file requires the secure viewer</p>
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

// Security overlay with mobile optimization
const SecurityOverlay = ({ isPublic = false }) => (
    <>
        <div className={styles.watermark}>
            {isPublic ? '' : 'CONFIDENTIAL merotuition.com'}
        </div>
        <div className={styles.securityBar}>
            <span className={styles.securityText}>
                {isPublic ? '🔓 Public Content' : '🔒 Protected Content'}
            </span>
        </div>
    </>
);

// Custom hook for file loading
const useSecureFile = (contentId, token, isPublic = false) => {
    const [fileUrl,         setFileUrl]         = useState(null);
    const [loading,         setLoading]         = useState(true);
    const [error,           setError]           = useState(null);

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

            // Clean up previous URL if it exists
            if (fileUrl) {
                cleanupFileUrl(fileUrl);
                setFileUrl(null);
            }

            const blob = await fetchFile(contentId, token, isPublic);
            
            // Validate blob
            if (!blob || blob.size === 0) {
                throw new Error('Received empty file');
            }

            const url = createFileUrl(blob);
            setFileUrl(url);
        } catch (err) {
            console.error('File loading error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [contentId, token, isPublic, fileUrl]);

    useEffect(() => {
        loadFile();

        return () => {
            if (fileUrl) {
                cleanupFileUrl(fileUrl);
            }
        };
    }, [contentId, token, isPublic]); // Removed fileUrl and loadFile from deps to prevent infinite loop

    return { fileUrl, loading, error, retry: loadFile };
};

// Main component
export default function SecureFileViewer({ content, className, allowPublicAccess = false }) {
    if (!content || !content.content_id) {
        return (
            <div className={`${styles.container} ${className || ''}`}>
                <ErrorMessage error="Invalid content provided" />
            </div>
        );
    }

    const { content_id, content_data }      = content;
    const { fileType }                      = parseContentData(content_data);

    const { data: session, status }         = useSession();
    const { fileUrl, loading, error, retry } = useSecureFile(
        content_id, 
        session?.accessToken, 
        allowPublicAccess
    );

    // Debug logging
    useEffect(() => {
        console.log('SecureFileViewer state:', {
            contentId: content_id,
            fileType,
            fileUrl,
            loading,
            error,
            sessionStatus: status,
            hasToken: !!session?.accessToken
        });
    }, [content_id, fileType, fileUrl, loading, error, status, session]);

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

        // Disable text selection on mobile for security
        const handleSelectStart = (e) => {
            if (!allowPublicAccess && isMobile()) {
                e.preventDefault();
                return false;
            }
        };

        window.addEventListener('beforeprint',  handleBeforePrint);
        document.addEventListener('keydown',     handleKeyDown);
        document.addEventListener('selectstart', handleSelectStart);

        return () => {
            window.removeEventListener('beforeprint',  handleBeforePrint);
            document.removeEventListener('keydown',     handleKeyDown);
            document.removeEventListener('selectstart', handleSelectStart);
        };
    }, [allowPublicAccess]);

    if (status === 'loading' && !allowPublicAccess) {
        return (
            <div className={`${styles.container} ${className || ''}`}>
                <Loading />
            </div>
        );
    }

    if (status === 'unauthenticated' && !allowPublicAccess) {
        return (
            <div className={`${styles.container} ${className || ''}`}>
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
        <div className={`${styles.container} ${className || ''}`}>
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
