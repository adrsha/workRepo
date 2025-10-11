import { useEffect, useState } from 'react';
import { useContentManager } from '@/hooks/useContentManager';
import { toSingular } from '@/utils/entityUtils';
import styles from '@/styles/EntityDetails.module.css';
import Loading from '@/app/components/Loading';
import { ContentRenderer } from '@/app/components/content';
import { ContentEditor } from '@/app/components/editor';
import { UserPermissionManager } from '@/app/components/UserPermissionManager';
import ContentPayer from '@/app/components/ContentPayer';

export const EntityDetailsClient = ({
    entityType,
    entityId,
    session,
    notifications,
    formControls,
    limitedAccessControls
}) => {
    const [showPermissionManager, setShowPermissionManager] = useState(false);
    const [selectedContentId, setSelectedContentId] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedForPayment, setSelectedForPayment] = useState([]);

    if (!entityType || !entityId) {
        return <div className={styles.errorState}>Missing required props: entityType or entityId</div>;
    }

    const {
        entityContent = [],
        entityDetails = [],
        loading = false,
        error = null,
        fetchEntityContent,
        fetchEntityDetails,
        addContent,
        deleteContent,
        assignContentPermissions
    } = useContentManager(entityType, entityId, session) || {};

    // Fetch data on mount and when dependencies change
    useEffect(() => {
        if (entityId) {
            if (fetchEntityDetails) {
                fetchEntityDetails();
            }
            if (fetchEntityContent) {
                fetchEntityContent();
            }
        }
    }, [fetchEntityContent, fetchEntityDetails, entityId, session?.user?.level]);

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
                contentType: 'text',
                contentData: {
                    ...(contentForm.content_title && {
                        title: contentForm.content_title
                    }),
                    text: contentForm.content_data,
                    uploadedBy: session?.user?.id,
                    isFile: false
                },
                isPublic: contentForm.is_public || false,
                ...(contentForm.authorized_users && {
                    authorizedUsers: contentForm.authorized_users
                }),
                price: parseFloat(contentForm.price || 0)
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

    const handleFileSave = async (file, isPublic = false, authorizedUsers = null, price = 0) => {
        if (!file) {
            notifications?.setError?.('No file provided');
            return;
        }

        try {
            await addContent({
                contentType: 'file',
                contentData: {
                    ...(formControls?.contentForm?.content_title && {
                        title: formControls.contentForm.content_title
                    }),
                    ...file
                },
                isPublic: isPublic,
                ...(authorizedUsers && { authorizedUsers }),
                price: parseFloat(price || 0),
            });

            notifications?.setSuccess?.('File uploaded successfully');
            formControls?.resetForm?.();
        } catch (error) {
            notifications?.setError?.(error?.message || 'Failed to upload file');
        }
    };

    const handlePermissionChange = async (contentId, userIds) => {
        try {
            await assignContentPermissions(contentId, userIds);
            notifications?.setSuccess?.('Permissions updated successfully');
            setShowPermissionManager(false);
        } catch (error) {
            notifications?.setError?.(error?.message || 'Failed to update permissions');
        }
    };

    // Payment handlers
    const handlePurchaseContent = (contentItem) => {
        setSelectedForPayment([contentItem]);
        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setSelectedForPayment([]);
        // Refresh content to show updated access
        if (fetchEntityContent) {
            fetchEntityContent();
        }
        notifications?.setSuccess?.('Payment submitted successfully! Access will be granted once approved.');
    };

    // Loading and error states
    if (loading) {
        return (
            <div className={styles.loadingState}>
                <Loading />
            </div>
        );
    }

    if (error && (!entityContent || entityContent.length === 0)) {
        return (
            <div className={styles.errorState}>
                Error: {error}
            </div>
        );
    }

    // Data processing with defensive checks
    const firstEntity = entityContent?.[0] || {};
    const contentItems = entityContent?.filter(item => item?.content_id) || [];
    const entitySingular = toSingular(entityType) || 'item';
    const titleField = `${entitySingular}_title`;
    const dateField = `${entitySingular}_date_time`;

    // Get paid content that user doesn't have access to
    const paidContentForBulkPurchase = contentItems.filter(item =>
        !item.user_has_access &&
        item.price &&
        parseFloat(item.price) > 0
    );

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
                            <span>Total Content: {entityDetails.content_count || 0}</span>
                            <span>Free Content: {entityDetails.free_count || 0}</span>
                            <span>Owned Content: {entityDetails.owned_count || 0}</span>
                        </div>

                        {/* Bulk Purchase Section for Regular Users */}
                        {session && !canEdit && paidContentForBulkPurchase.length > 0 && (
                            <div className={styles.bulkPurchaseSection}>
                                <p className={styles.restrictedNotice}>
                                    Some content in this {entitySingular} requires payment.
                                </p>
                                <div className={styles.bulkPurchaseInfo}>
                                    <span>
                                        {paidContentForBulkPurchase.length} paid item(s) -
                                        Total: Rs. {paidContentForBulkPurchase
                                            .reduce((total, item) => total + parseFloat(item.price || 0), 0)
                                            .toFixed(2)
                                        }
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedForPayment(paidContentForBulkPurchase);
                                        setShowPaymentModal(true);
                                    }}
                                    className={styles.bulkPurchaseButton}
                                >
                                    Purchase All Paid Content
                                </button>
                            </div>
                        )}
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
                                            onPurchaseContent={() => handlePurchaseContent(content)}
                                            entityType={entityType}
                                            entityId={entityId}
                                        />
                                        {canEdit && (
                                            <div>
                                                <div className={styles.contentActions}>
                                                    <button
                                                        onClick={() => handleDeleteContent(content.content_id)}
                                                        className={styles.deleteButton}
                                                        type="button"
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedContentId(content.content_id);
                                                            setShowPermissionManager(true);
                                                        }}
                                                        className={styles.permissionButton}
                                                        type="button"
                                                    >
                                                        Manage Permissions
                                                    </button>
                                                </div>
                                                <div className={styles.accessInfo}>
                                                    {content.is_public ? (
                                                        <small className={styles.publicTag}>Public content</small>
                                                    ) : (
                                                        <small className={styles.privateTag}>
                                                            Private - {content.authorized_users?.length || 0} users assigned
                                                        </small>
                                                    )}
                                                    {content.price && parseFloat(content.price) > 0 && (
                                                        <small className={styles.priceTag}>
                                                            Price: Rs. {parseFloat(content.price).toFixed(2)}
                                                        </small>
                                                    )}
                                                    {content.authorized_users && content.authorized_users.length > 0 && (
                                                        <div className={styles.authorizedUsers}>
                                                            <small>
                                                                Assigned to: {content.authorized_users.map(u => u.user_name).join(', ')}
                                                            </small>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className={styles.noContent}>
                            No content available for you in this {entitySingular}.
                        </p>
                    )}
                </div>
            </div>

            {canEdit && formControls && (
                <div className={styles.addContentSection}>
                    {formControls.isEditing ? (
                        <ContentEditor
                            showTitle={true}
                            titleRequired={true} 
                            showAccessControls={true}
                            parentId={entityId}
                            parentType={entityType}
                            isAdmin={canEdit}
                            contentForm={formControls.contentForm || {}}
                            onUpdateForm={formControls.updateForm}
                            onSaveText={() => handleAddTextContent(formControls.contentForm || {})}
                            onFileSave={handleFileSave}
                            onCancel={formControls.resetForm}
                            title="Add Content"
                            saveButtonText="Save Content"
                            limitedAccessControls = {limitedAccessControls}
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

            {/* Permission Management Modal */}
            {showPermissionManager && selectedContentId && (
                <UserPermissionManager
                    contentId={selectedContentId}
                    entityType={entityType}
                    entityId={entityId}
                    onSave={(userIds) => handlePermissionChange(selectedContentId, userIds)}
                    onCancel={() => {
                        setShowPermissionManager(false);
                        setSelectedContentId(null);
                    }}
                />
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedForPayment.length > 0 && (
                <ContentPayer
                    contentItems={selectedForPayment}
                    onSuccess={handlePaymentSuccess}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedForPayment([]);
                    }}
                    entityType={entityType}
                    entityId={entityId}
                />
            )}
        </main>
    );
};
