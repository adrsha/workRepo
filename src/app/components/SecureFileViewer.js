'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from '../../styles/SecureFileViewer.module.css';

export default function SecureFileViewer({ contentId, fileType }) {
  const { data: session } = useSession();
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFileContent = async () => {
      try {
        // Dynamically determine the API route
        const route = `/api/secureFile/${contentId}`;

        const response = await fetch(route, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to fetch file');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setFileContent(url);
      } catch (err) {
        console.error('Error fetching file:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (contentId) {
      fetchFileContent();
    }

    return () => {
      if (fileContent) {
        URL.revokeObjectURL(fileContent);
      }
    };
  }, [contentId, session?.accessToken]);

  const renderFilePreview = () => {
    if (!fileContent) return null;

    if (fileType?.includes('image/')) {
      return (
        <div className={styles.imageContainer}>
          <img
            src={fileContent}
            alt="File preview"
            className={styles.filePreview}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      );
    } else if (fileType?.includes('pdf')) {
      return (
        <div className={styles.pdfContainer}>
          <iframe
            src={`${fileContent}#toolbar=0&navpanes=0&scrollbar=0`}
            className={styles.pdfViewer}
            title="PDF Preview"
          />
        </div>
      );
    } else {
      return (
        <div className={styles.genericPreview}>
          <p>This file type can only be viewed in the secure viewer</p>
          <button
            className={styles.viewButton}
            onClick={() => window.open(`/viewer/${contentId}`, '_blank')}
          >
            Open in Secure Viewer
          </button>
        </div>
      );
    }
  };

  return (
    <div className={styles.secureViewerContainer}>
      {loading && <div className={styles.loading}>Loading file content...</div>}
      {error && <div className={styles.error}>Error: {error}</div>}
      <div className={styles.filePreviewContainer}>
        {!loading && !error && renderFilePreview()}
      </div>

      <div className={styles.watermark}>CONFIDENTIAL</div>

      <div className={styles.securityNotice}>
        This content is protected and for viewing purposes only
      </div>
    </div>
  );
}
