// components/ClassContent.js
'use client';
import { useSession } from 'next-auth/react';
import { useClassContent } from '../../hooks/useClassContent';
import { useNotifications } from '../../hooks/useNotifications';
import { useContentForm } from '../../hooks/useContentForm';
import { createContentHandlers } from '../../handlers/contentHandlers';

import styles from '../../styles/ClassContent.module.css';
import { LoadingState, EmptyState, NotificationToasts } from './ui';
import { ContentList } from './content';
import { ContentEditor } from './editor';

export default function ClassContent({ classId, isTeacher }) {
    const { data: session } = useSession();
    const { contents, setContents, loading, refetch } = useClassContent(classId, session);
    const notifications = useNotifications();
    const formControls = useContentForm();

    const contentHandlers = createContentHandlers(
        classId,
        session,
        contents,
        setContents,
        notifications,
        formControls,
        refetch
    );

    if (loading) return <LoadingState />;

    return (
        <div className={styles.contentContainer}>
            <h3 className={styles.contentTitle}>Class Content</h3>
            {contents.length === 0 ? (
                <EmptyState isTeacher={isTeacher} />
            ) : (
                <ContentList
                    contents={contents}
                    isTeacher={isTeacher}
                    onDelete={contentHandlers.handleDeleteContent}
                />
            )}

            {isTeacher && (
                <div className={styles.addContentSection}>
                    {formControls.isEditing ? (
                        // In your main ClassContent component, update the prop name:
                        <ContentEditor
                            classId={classId}
                            contentForm={formControls.contentForm}
                            onUpdateForm={formControls.updateForm}
                            onSaveText={() => contentHandlers.handleAddTextContent(formControls.contentForm)}
                            onFileSave={contentHandlers.handleFileSave} // Changed from onFileUpload
                            onCancel={formControls.resetForm}
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
            )}

            <NotificationToasts
                error={notifications.error}
                success={notifications.success}
                onCloseError={() => notifications.setError(null)}
                onCloseSuccess={() => notifications.setSuccess(null)}
            />
        </div>
    );
}
