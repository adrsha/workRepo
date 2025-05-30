// ============== MAIN COMPONENT ==============
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
    const { contents, setContents, loading } = useClassContent(classId, session);
    const notifications = useNotifications();
    const formControls = useContentForm();
    
    const contentHandlers = createContentHandlers(
        classId,
        session,
        contents,
        setContents,
        notifications,
        formControls
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
                        <ContentEditor
                            contentForm={formControls.contentForm}
                            onUpdateForm={formControls.updateForm}
                            onSaveText={() => contentHandlers.handleAddTextContent(formControls.contentForm)}
                            onFileUpload={contentHandlers.handleFileUpload}
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
