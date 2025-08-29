'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from '../../../styles/Notices.module.css';
import Loading from '../../components/Loading';
import { Toast } from '../../components/Toast';
import { useNoticeData } from '../../../hooks/useNoticeData';
import { useNotifications } from '../../../hooks/useNotifications';
import { useContentForm } from '../../../hooks/useContentForm';
import { ContentRenderer } from '../../components/content';
import { ContentEditor } from '../../components/editor';
import { createNoticeContentHandlers } from '@/handlers/noticeHandlers';


const NoticeHeader = ({ title }) => (
    <div className={styles.noticeHeader}>
        <h1 className={styles.title}>
            {title || 'Notice'}
        </h1>
    </div>
);

const NoticeMetadata = ({ publishedDate }) => {
    const formatDate = (dateTimeString) => {
        if (!dateTimeString) return '';
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={styles.noticeInfo}>
            <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Published</span>
                <span className={styles.infoValue}>
                    {formatDate(publishedDate)}
                </span>
            </div>
        </div>
    );
};

const DeleteButton = ({ onDelete, contentId }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (isDeleting) return;

        if (confirm('Are you sure you want to delete this content?')) {
            setIsDeleting(true);
            try {
                await onDelete(contentId);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <button
            className={`${styles.deleteContentButton} ${isDeleting ? styles.deleting : ''}`}
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete this content"
        >
            {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
    );
};

const NoticeContentItem = ({ content, canEdit, onDeleteContent }) => {
    const transformedContent = {
        content_id: content.content_id,
        content_type: content.content_type || 'text',
        content_data: content.content_data,
        created_at: content.created_at || new Date().toISOString(),
        is_public: content.is_public || true
    };

    return (
        <div className={styles.noticeContentItem}>
            <div className={styles.contentBody}>
                <ContentRenderer content={transformedContent} allowPublicAccess={true}/>
            </div>
            
            {canEdit && (
                <div className={styles.contentActions}>
                    <DeleteButton 
                        onDelete={onDeleteContent} 
                        contentId={content.content_id} 
                    />
                </div>
            )}
        </div>
    );
};

const NoticeContentList = ({ contentItems, canEdit, onDeleteContent }) => {
    if (!contentItems || contentItems.length === 0) {
        return <NoContentMessage />;
    }

    return (
        <div className={styles.noticeContentList}>
            {contentItems.map((content) => (
                <NoticeContentItem
                    key={content.content_id}
                    content={content}
                    canEdit={canEdit}
                    onDeleteContent={onDeleteContent}
                />
            ))}
        </div>
    );
};

const NoContentMessage = () => (
    <div className={styles.noContentMessage}>
        <p>No content available for this notice.</p>
    </div>
);

const ToastContainer = ({ notifications }) => {
    return (
        <>
            {notifications.error && (
                <Toast
                    message={notifications.error}
                    type="error"
                    onClose={() => notifications.setError(null)}
                />
            )}
            {notifications.success && (
                <Toast
                    message={notifications.success}
                    type="success"
                    onClose={() => notifications.setSuccess(null)}
                />
            )}
        </>
    );
};

const AddContentSection = ({ canEdit, formControls, contentHandlers, noticeId }) => {
    if (!canEdit) return null;

    return (
        <div className={styles.addContentSection}>
            {formControls.isEditing ? (
                <ContentEditor
                    parentId={noticeId}
                    parentType="notices"
                    contentForm={formControls.contentForm}
                    onUpdateForm={formControls.updateForm}
                    onSaveText={() => {
                        contentHandlers.handleAddContent(formControls.contentForm);
                    }}
                    onFileSave={contentHandlers.handleFileSave}
                    onCancel={formControls.resetForm}
                    isEditing={false}
                />
            ) : (
                <div className={styles.actionButtons}>
                    <button
                        className={styles.addButton}
                        onClick={() => formControls.setIsEditing(true)}
                    >
                        Add Content
                    </button>
                </div>
            )}
        </div>
    );
};

const ErrorDisplay = ({ error }) => (
    <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
            <h2>Error</h2>
            <p>{error}</p>
        </div>
    </div>
);

export default function NoticeDetailsClient({ noticeId }) {
    const { data: session } = useSession();

    const { noticeDetails, setNoticeDetails, loading, error, refetch } = useNoticeData(noticeId);
    const notifications = useNotifications();
    const formControls = useContentForm();

    const canEdit = session?.user && (session.user.level >= 1 || session.user.role === 'admin');

    const contentHandlers = createNoticeContentHandlers(
        session,
        noticeId,
        setNoticeDetails,
        notifications,
        formControls,
        refetch
    );

    if (loading) return <Loading />;

    if (error && !noticeDetails.length) {
        return <ErrorDisplay error={error} />;
    }

    const firstNotice = noticeDetails[0];
    const contentItems = noticeDetails.filter(item => item.content_id);

    return (
        <main className={styles.mainSection}>
            <div className={styles.noticeCard}>
                {firstNotice && (
                    <>
                        <NoticeHeader 
                            title={firstNotice.notices_title} 
                        />
                        
                        <NoticeMetadata 
                            publishedDate={firstNotice.notices_date_time}
                        />
                    </>
                )}
                
                <NoticeContentList
                    contentItems={contentItems}
                    canEdit={canEdit}
                    onDeleteContent={contentHandlers.handleDeleteContent}
                />
            </div>
            
            <AddContentSection
                canEdit={canEdit}
                formControls={formControls}
                contentHandlers={contentHandlers}
                noticeId={noticeId}
            />

            <ToastContainer notifications={notifications} />
        </main>
    );
}
