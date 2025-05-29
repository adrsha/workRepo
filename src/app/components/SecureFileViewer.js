'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from '../../styles/SecureFileViewer.module.css';

// ============== UTILITY FUNCTIONS ==============
const createObjectURL = (blob) => URL.createObjectURL(blob);

const revokeObjectURL = (url) => {
    if (url) URL.revokeObjectURL(url);
};

const isImageType = (fileType) => fileType?.includes('image/');

const isPdfType = (fileType) => fileType?.includes('pdf');

const buildApiRoute = (contentId) => `/api/secureFile/${contentId}`;

const buildAuthHeaders = (accessToken) => ({
    Authorization: `Bearer ${accessToken}`,
});

const parseContentData = (contentData) => {
    try {
        return typeof contentData === 'string' ? JSON.parse(contentData) : contentData;
    } catch (error) {
        console.error('Failed to parse content data:', error);
        return {};
    }
};

// ============== API FUNCTIONS ==============
const fetchFileBlob = async (contentId, accessToken) => {
    const route = buildApiRoute(contentId);
    const headers = buildAuthHeaders(accessToken);

    const response = await fetch(route, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || 'Failed to fetch file';
        } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    return response.blob();
};

// ============== RENDER COMPONENTS ==============
const ImagePreview = ({ fileContent }) => (
    <div className={styles.imageContainer}>
        <img
            src={fileContent}
            alt="File preview"
            className={styles.filePreview}
            onContextMenu={(e) => e.preventDefault()}
        />
    </div>
);

const PdfPreview = ({ fileContent }) => (
    <div className={styles.pdfContainer}>
        <iframe
            src={`${fileContent}#toolbar=0&navpanes=0&scrollbar=0`}
            className={styles.pdfViewer}
            title="PDF Preview"
        />
    </div>
);

const GenericPreview = ({ contentId }) => (
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

const LoadingState = () => (
    <div className={styles.loading}>Loading file content...</div>
);

const ErrorState = ({ error }) => (
    <div className={styles.error}>Error: {error}</div>
);

const SecurityOverlay = () => (
    <>
        <div className={styles.watermark}>CONFIDENTIAL</div>
        <div className={styles.securityNotice}>
            This content is protected and for viewing purposes only
        </div>
    </>
);

// ============== PREVIEW SELECTOR ==============
const FilePreview = ({ fileContent, fileType, contentId }) => {
    if (!fileContent) return null;
    console.log(fileType)

    if (isImageType(fileType)) {
        return <ImagePreview fileContent={fileContent} />;
    }

    if (isPdfType(fileType)) {
        return <PdfPreview fileContent={fileContent} />;
    }

    return <GenericPreview contentId={contentId} />;
};

// ============== CUSTOM HOOKS ==============
const useFileContent = (contentId, accessToken) => {
    const [fileContent, setFileContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadFileContent = async () => {
            if (!contentId || !accessToken) {
                setError('Missing content ID or access token');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                const blob = await fetchFileBlob(contentId, accessToken);
                const url = createObjectURL(blob);
                
                setFileContent(url);
            } catch (err) {
                console.error('Error fetching file:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadFileContent();

        return () => {
            if (fileContent) {
                revokeObjectURL(fileContent);
            }
        };
    }, [contentId, accessToken]);

    return { fileContent, loading, error };
};

// ============== MAIN COMPONENT ==============
export default function SecureFileViewer({ content }) {
    const { content_id, content_data } = content;
    
    // Parse content data properly
    const parsedData = parseContentData(content_data);
    const fileType = parsedData?.fileType;
    
    const { data: session } = useSession();
    const { fileContent, loading, error } = useFileContent(content_id, session?.accessToken);

    return (
        <div className={styles.secureViewerContainer}>
            {loading && <LoadingState />}
            {error && <ErrorState error={error} />}

            <div className={styles.filePreviewContainer}>
                {!loading && !error && (
                    <FilePreview
                        fileContent={fileContent}
                        fileType={fileType}
                        contentId={content_id}
                    />
                )}
            </div>

            <SecurityOverlay />
        </div>
    );
}
