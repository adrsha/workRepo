// components/ClassContent.js
'use client';
import { useSession } from 'next-auth/react';
import { useClassContent } from '../../hooks/useClassContent';
import { useNotifications } from '../../hooks/useNotifications';
import { useContentForm } from '../../hooks/useContentForm';
import { createContentHandlers } from '../../handlers/contentHandlers';
import styles from '../../styles/ClassContent.module.css';
import { LoadingState, EmptyState } from './ui';
import { ContentList } from './content';
import { ContentEditor } from './editor';
import { Toast } from './Toast';

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

const AddContentSection = ({ isTeacher, formControls, contentHandlers, classId }) => {
    if (!isTeacher) return null;
    
    return (
        <div className={styles.addContentSection}>
            {formControls.isEditing ? (
                <ContentEditor
                    classId={classId}
                    contentForm={formControls.contentForm}
                    onUpdateForm={formControls.updateForm}
                    onSaveText={() => contentHandlers.handleAddTextContent(formControls.contentForm)}
                    onFileSave={contentHandlers.handleFileSave}
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
    );
};

const ContentSection = ({ contents, isTeacher, contentHandlers }) => {
    if (contents.length === 0) {
        return <EmptyState isTeacher={isTeacher} />;
    }
    
    return (
        <ContentList
            contents={contents}
            isTeacher={isTeacher}
            onDelete={contentHandlers.handleDeleteContent}
        />
    );
};

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
            
            <ContentSection 
                contents={contents}
                isTeacher={isTeacher}
                contentHandlers={contentHandlers}
            />
            
            <AddContentSection
                isTeacher={isTeacher}
                formControls={formControls}
                contentHandlers={contentHandlers}
                classId={classId}
            />
            
            <ToastContainer notifications={notifications} />
        </div>
    );
}
