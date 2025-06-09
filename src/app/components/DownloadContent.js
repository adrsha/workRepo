'use client';

import { useState, useEffect } from 'react';
import { MarkdownContent } from '../../utils/markdown';
import styles from '../../styles/DownloadContent.module.css';

// Utility functions
const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return 'Invalid date';
    }
};

const getFileIcon = (fileType) => {
    if (!fileType) return '📄';
    const type = String(fileType).toLowerCase();
    if (type.includes('pdf')) return '📕';
    if (type.includes('image')) return '🖼️';
    if (type.includes('zip') || type.includes('rar')) return '🗜️';
    if (type.includes('word') || type.includes('doc')) return '📘';
    return '📁';
};

const formatFileSize = (bytes) => {
    if (!bytes || isNaN(parseInt(bytes))) return '';
    bytes = parseInt(bytes);
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
};

// Component for loading state
const LoadingState = () => (
    <section className={styles.publicContentContainer}>
        <div className={styles.loadingIndicator}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading public content...</p>
        </div>
    </section>
);

// Component for error state
const ErrorState = ({ error }) => (
    <section className={styles.publicContentContainer}>
        <div className={styles.errorMessage}>
            <p>❌ {error}</p>
            <button
                onClick={() => window.location.reload()}
                style={{
                    padding: '8px 16px',
                    background: '#f0f0f0',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '10px'
                }}
            >
                🔄 Refresh
            </button>
        </div>
    </section>
);

// Component for empty state
const EmptyState = () => (
    <section className={styles.publicContentContainer}>
        <div className={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 5V19H5V5H19ZM21 3H3V21H21V3ZM12 7H7V9H12V7ZM17 11H7V13H17V11ZM17 15H7V17H17V15Z" fill="currentColor" />
            </svg>
            <p>No public content available</p>
        </div>
    </section>
);

// Component for content item
const ContentItem = ({ item }) => (
    <li key={item.content_id} className={styles.contentItem}>
        <div className={styles.contentItemInner}>
            
            <div className={styles.contentIcon}>
                {item.isFile ? getFileIcon(item.fileType) : '📝'}
            </div>
            
            <div className={styles.contentDetails}>
                <h3 className={styles.contentTitle}>
                    {item.isFile ? item.originalName : 'Text Note'}
                </h3>
                <div className={styles.contentMeta}>
                    <span className={styles.contentDate}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm1-8h4v2h-6V7h2v5z" fill="currentColor" />
                        </svg>
                        {formatDate(item.created_at)}
                    </span>
                    {item.isFile && (
                        <span className={styles.contentSize}>
                            {formatFileSize(item.fileSize)}
                        </span>
                    )}
                </div>
                {!item.isFile && item.text && (
                    <div className={styles.contentTextPreview}>
                        <MarkdownContent content={JSON.parse(item.text).text} />
                    </div>
                )}
            </div>
            
            {item.isFile && item.url && (
                <a
                    href={item.url}
                    download
                    className={styles.downloadLink}
                    title="Download file"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 10h5l-6 6-6-6h5V3h2v7zm-9 9h16v2H4v-2z" fill="currentColor" />
                    </svg>
                </a>
            )}
        </div>
        
    </li>
);

// Custom hook for fetching content
const usePublicContent = () => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                if (data.content && Array.isArray(data.content)) {
                    setContent(data.content);
                } else {
                    setError('Invalid data format received from server');
                }
            } catch (err) {
                setError(`Failed to load content: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, []);

    return { content, loading, error };
};

// Main component
export default function PublicContentList() {
    const { content, loading, error } = usePublicContent();

    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;
    if (content.length === 0) return <EmptyState />;

    return (
        <section className={styles.publicContentContainer}>
            <h2 className={styles.contentHeader}>📚 Public Resources</h2>
            <ul className={styles.contentList}>
                {content.map((item) => (
                    <ContentItem key={item.content_id} item={item} />
                ))}
            </ul>
        </section>
    );
}
