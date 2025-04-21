'use client';
import "../../global.css"
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from '../../../styles/Viewer.module.css';

export default function SecureViewer() {
  // Refs for scroll handling
  const pdfWrapperRef = useRef(null);
  const objectRef = useRef(null);
  const interactionBlockerRef = useRef(null);
  const [fileData, setFileData] = useState(null);

  // Prevent keyboard shortcuts for printing/saving
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && (e.key === 's' || e.key === 'p')) ||
        (e.ctrlKey && e.shiftKey && e.key === 's')) {
        e.preventDefault();
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Manual scroll handling for the interaction blocker
  useEffect(() => {
    const interactionBlocker = interactionBlockerRef.current;
    const pdfObject = objectRef.current;

    if (!interactionBlocker || !pdfObject) return;

    // Function to handle wheel events on the interaction blocker
    const handleWheel = (event) => {
      event.preventDefault();

      // Get the underlying PDF document
      const pdfDocument = pdfObject.contentDocument || pdfObject.contentWindow?.document;
      if (!pdfDocument) return;

      // Calculate scroll amounts
      const deltaY = event.deltaY;
      const deltaX = event.deltaX;

      // Apply the scroll to the PDF document
      console.log(pdfDocument)
      pdfDocument.documentElement.scrollTop += deltaY;
      pdfDocument.documentElement.scrollLeft += deltaX;
    };

    // Add wheel event listener to the interaction blocker
    interactionBlocker.addEventListener('wheel', handleWheel, { passive: false });

    // Cleanup
    return () => {
      interactionBlocker.removeEventListener('wheel', handleWheel);
    };
  }, [fileData]); // Reattach when fileData changes

  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || status === 'loading') return;

    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const fetchFileData = async () => {
      try {
        const response = await fetch(`/api/fileData/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch file data');
        }

        const data = await response.json();
        setFileData(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFileData();
  }, [id, session, status, router]);

  if (loading) return <div className={styles.loading}>Loading viewer...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!fileData) return <div className={styles.error}>File not found</div>;

  return (
    <div className={styles.viewerContainer} >
      <div className={styles.viewerHeader}>
        <h2 className={styles.fileName}>{fileData.file_name}</h2>
        <p className={styles.fileInfo}>
          {fileData.file_size} • {fileData.mime_type}
        </p>
      </div>

      <div className={styles.viewerContent}>
        {fileData.mime_type === 'application/pdf' ? (
          <div className={styles.pdfWrapper} ref={pdfWrapperRef}>
            {/* For PDFs, we use object tag with restricted features */}
            <object
              ref={objectRef}
              data={`/api/pdfProxy/${id}#toolbar=0&navpanes=0&scrollbar=0`}
              type="application/pdf"
              className={styles.fileFrame}
              aria-label="PDF Document"
              onError={() => setError("Failed to load PDF document.")}
            >
              <div className={styles.fallbackMessage}>
                Your browser doesn't support embedded PDF viewing.
                Please use a modern browser to view this document.
              </div>
            </object>
            {/* Modified interaction blocker with scroll handling */}
            <div
              ref={interactionBlockerRef}
              className={styles.interactionBlocker}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
                pointerEvents: 'auto' // Changed to allow wheel events to be captured
              }}
            ></div>
          </div>
        ) : (
          <iframe
            src={`/api/secureFile/${id}`}
            className={styles.fileFrame}
            title="File Viewer"
            sandbox="allow-same-origin allow-scripts"
          />
        )}
      </div>

      <div className={styles.watermarkOverlay}>
        {/* Multiple watermarks for better coverage */}
        <div
          className={styles.watermark}
          data-content={session?.user?.email || 'CONFIDENTIAL'}
        >
          {session?.user?.email || 'CONFIDENTIAL'} - {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className={styles.securityNotice}>
        This document is confidential and for viewing purposes only.
        Unauthorized copying or distribution is prohibited.
      </div>
    </div >
  );
}
