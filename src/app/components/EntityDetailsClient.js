import { useEffect } from 'react';
import { useContentManager } from '@/hooks/useContentManager';
import { toSingular } from '@/utils/entityUtils';
import styles from '@/styles/EntityDetails.module.css';
import Loading from '@/app/components/Loading';
import { ContentRenderer } from '@/app/components/content';
import { ContentEditor } from '@/app/components/editor';

// Generic Details Client Component
export const EntityDetailsClient = ({ 
    entityType, 
    entityId, 
    session,
    notifications,
    formControls 
}) => {
    // Input validation
    if (!entityType || !entityId) {
        return <div className={styles.errorState}>Missing required props: entityType or entityId</div>;
    }

    const {
        entityDetails    = [],
        loading         = false,
        error           = null,
        fetchEntityDetails,
        addContent,
        deleteContent,
    } = useContentManager(entityType, entityId, session) || {};

    // Fetch data on mount and when dependencies change
    useEffect(() => {
        if (fetchEntityDetails && entityId) {
            fetchEntityDetails();
        }
    }, [fetchEntityDetails, entityId]);

    // Permission check with defensive defaults
    const canEdit = session?.user && (
        session.user.level >= 1 || 
        session.user.role === 'admin'
    );

    // Content handlers with proper error handling
    const handleAddTextContent = async (contentForm) => {
        if (!contentForm?.content_data?.trim()) {
            notifications?.setError?.('Please fill in the content data');
            return;
        }

        try {
            await addContent({
                contentType : 'text',
                contentData : { text: contentForm.content_data, uploadedBy: session?.user?.id, isFile: false },
                isPublic    : contentForm.is_public || false
            });
            
            notifications?.setSuccess?.('Content added successfully');
            formControls?.resetForm?.();
        } catch (error) {
            notifications?.setError?.(error?.message || 'Failed to add content');
        }
    };

    const handleDeleteContent = async (contentId) => {
        if (!contentId || !confirm('Are you sure you want to delete this content?')) {
            return;
        }

        try {
            await deleteContent(contentId);
            notifications?.setSuccess?.('Content deleted successfully');
        } catch (error) {
            notifications?.setError?.(error?.message || 'Failed to delete content');
        }
    };

    const handleFileSave = async (file, isPublic = false) => {
        if (!file) {
            notifications?.setError?.('No file provided');
            return;
        }

        try {
            await addContent({
                contentType : 'file',
                contentData : file,
                isPublic    : isPublic
            });
            
            notifications?.setSuccess?.('File uploaded successfully');
            formControls?.resetForm?.();
        } catch (error) {
            notifications?.setError?.(error?.message || 'Failed to upload file');
        }
    };

    // Loading and error states
    if (loading) {
        return (
            <div className={styles.loadingState}>
                <Loading />
            </div>
        );
    }
    
    if (error && (!entityDetails || entityDetails.length === 0)) {
        return (
            <div className={styles.errorState}>
                Error: {error}
            </div>
        );
    }

    // Data processing with defensive checks
    const firstEntity = entityDetails?.[0] || {};
    const contentItems = entityDetails?.filter(item => item?.content_id) || [];
    const entitySingular = toSingular(entityType) || 'item';
    const titleField = `${entitySingular}_title`;
    const dateField = `${entitySingular}_date_time`;

    return (
        <main className={styles.mainSection}>
            <div className={styles.entityCard}>
                {firstEntity && Object.keys(firstEntity).length > 0 && (
                    <div className={styles.entityHeader}>
                        <h1>
                            {firstEntity[titleField] || `Untitled ${entitySingular}`}
                        </h1>
                        <div className={styles.entityMetadata}>
                            <span>
                                Published: {
                                    firstEntity[dateField] 
                                        ? new Date(firstEntity[dateField]).toLocaleString()
                                        : 'Unknown date'
                                }
                            </span>
                        </div>
                    </div>
                )}
                
                <div className={styles.contentList}>
                    {contentItems.length > 0 ? (
                        contentItems.map((content) => {
                            if (!content?.content_id) return null;
                            
                            return (
                                <div key={content.content_id} className={styles.contentItem}>
                                    <div className={styles.contentBody}>
                                        <ContentRenderer 
                                            content={content} 
                                            allowPublicAccess={true} 
                                        />
                                    </div>
                                    {canEdit && (
                                        <button 
                                            onClick={() => handleDeleteContent(content.content_id)}
                                            className={styles.deleteButton}
                                            type="button"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p className={styles.noContent}>
                            No content available for this {entitySingular}.
                        </p>
                    )}
                </div>
            </div>
            
            {canEdit && formControls && (
                <div className={styles.addContentSection}>
                    {formControls.isEditing ? (
                        <ContentEditor
                            parentId={entityId}
                            parentType={entityType}
                            contentForm={formControls.contentForm || {}}
                            onUpdateForm={formControls.updateForm}
                            onSaveText={() => handleAddTextContent(formControls.contentForm || {})}
                            onFileSave={handleFileSave}
                            onCancel={formControls.resetForm}
                        />
                    ) : (
                        <button 
                            onClick={() => formControls.setIsEditing?.(true)}
                            className={styles.addContentButton}
                            type="button"
                        >
                            Add Content
                        </button>
                    )}
                </div>
            )}
        </main>
    );
};
