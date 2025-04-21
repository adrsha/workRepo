'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import FileUpload from './FileUpload';
import SecureFileViewer from './SecureFileViewer'; // Import our new component
import styles from '../../styles/ClassContent.module.css';

export default function ClassContent({ classId, isTeacher }) {
  const { data: session } = useSession();
  const [contents, setContents] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [contentType, setContentType] = useState('text');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch class content
  useEffect(() => {
    if (!classId) return;

    const fetchClassContent = async () => {
      try {
        const response = await fetch(`/api/classContent/${classId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setContents(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to fetch content:', errorData);
        }
      } catch (err) {
        console.error('Error fetching class content:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassContent();
  }, [classId, session?.accessToken]);

  const addContent = async () => {
    if (!newContent.trim() && contentType === 'text') {
      setError('Content cannot be empty');
      return;
    }

    try {
      const response = await fetch(`/api/classContent/${classId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          classId,
          contentType,
          contentData: newContent
        }),
      });
      console.log('Content:', newContent, response);
      if (response.ok) {
        const data = await response.json();
        setContents([...contents, data]);
        setNewContent('');
        setIsEditing(false);
        setSuccess('Content added successfully');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to add content');
      }
    } catch (err) {
      console.error('Error adding content:', err);
      setError('Network error. Please try again.');
    }
  };

  const deleteContent = async (contentId) => {
    try {
      const response = await fetch(`/api/classContent/${contentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      if (response.ok) {
        setContents(contents.filter(content => content.content_id !== contentId));
        setSuccess('Content deleted successfully');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to delete content');
      }
    } catch (err) {
      console.error('Error deleting content:', err);
      setError('Network error. Please try again.');
    }
  };

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('classId', classId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setContents([...contents, data]);
        setSuccess('File uploaded successfully');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to upload file');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Network error. Please try again.');
    }
  };

  const renderContent = (content) => {
    if (!content) return null;

    let contentData = content.content_data;

    switch (content.content_type) {
      case 'text':
        return (
          <div
            className={styles.textContent}
            dangerouslySetInnerHTML={{ __html: content.content_data }}
          />
        );

      case 'image':
      case 'file':
        if (typeof contentData === 'string' && contentData.trim().startsWith('{')) {
          try {
            contentData = JSON.parse(contentData);
          } catch (err) {
            console.warn('Invalid JSON in content_data:', contentData);
            contentData = {};
          }
        }
        return (
          <div className={styles.fileContent}>
            <SecureFileViewer
              contentId={content.content_id}
              fileType={contentData?.fileType || 'application/octet-stream'}
            />
          </div>
        );

      default:
        return <div>{content.content_data}</div>;
    }
  };

  return (
    <div className={styles.contentContainer}>
      <h3 className={styles.contentTitle}>Class Content</h3>

      {loading ? (
        <div className={styles.loadingState}>Loading content...</div>
      ) : (
        <>
          {contents.length === 0 ? (
            <div className={styles.emptyState}>
              {isTeacher
                ? "No content has been added to this class yet. Add content using the button below."
                : "No content has been added to this class yet."}
            </div>
          ) : (
            <div className={styles.contentList}>
              {contents.map((content) => (
                <div key={content.content_id} className={styles.contentItem}>
                  {renderContent(content)}
                  {isTeacher && (
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteContent(content.content_id)}
                      aria-label="Delete content"
                    >
                      ✕
                    </button>
                  )}
                  <div className={styles.contentMeta}>
                    {new Date(content.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isTeacher && (
            <div className={styles.addContentSection}>
              {isEditing ? (
                <div className={styles.contentEditor}>
                  <div className={styles.editorHeader}>
                    <div className={styles.contentTypeSelector}>
                      <button
                        className={`${styles.typeButton} ${contentType === 'text' ? styles.active : ''}`}
                        onClick={() => setContentType('text')}
                      >
                        Text
                      </button>
                    </div>
                    <button
                      className={styles.cancelButton}
                      onClick={() => {
                        setIsEditing(false);
                        setNewContent('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  {contentType === 'text' && (
                    <div className={styles.textEditor}>
                      <textarea
                        className={styles.contentTextarea}
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Enter rich text content here..."
                        rows={10}
                      />
                      <div className={styles.formatControls}>
                        <button onClick={() => setNewContent(newContent + '**bold text**')}>Bold</button>
                        <button onClick={() => setNewContent(newContent + '*italic text*')}>Italic</button>
                        <button onClick={() => setNewContent(newContent + '# Heading')}>Heading</button>
                        <button onClick={() => setNewContent(newContent + '[Link](https://example.com)')}>Link</button>
                      </div>
                    </div>
                  )}

                  <div className={styles.editorFooter}>
                    <button
                      className={styles.saveButton}
                      onClick={addContent}
                    >
                      Save Content
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.actionButtons}>
                  <button
                    className={styles.addButton}
                    onClick={() => setIsEditing(true)}
                  >
                    Add Content
                  </button>
                  <FileUpload onFileUpload={handleFileUpload} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Error toast */}
      {error && (
        <div className={styles.toast}>
          <div className={styles.toastContent}>
            <span className={styles.toastMessage}>{error}</span>
            <button
              className={styles.toastClose}
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Success toast */}
      {success && (
        <div className={`${styles.toast} ${styles.successToast}`}>
          <div className={styles.toastContent}>
            <span className={styles.toastMessage}>{success}</span>
            <button
              className={styles.toastClose}
              onClick={() => setSuccess(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
