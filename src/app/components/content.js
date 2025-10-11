// src/app/components/content.js
import React, { useState, useEffect } from 'react';
import styles from '../../styles/ClassContent.module.css';
import SecureFileViewer from './SecureFileViewer';
import { MarkdownContent } from '../../utils/markdown';

// Improved visibility badge with better UX
export const VisibilityBadge = ({ is_public, onToggle, canToggle, isTeacher }) => {
    const [isToggling, setIsToggling] = useState(false);

    const handleToggle = async () => {
        if (!canToggle || isToggling) return;
        
        setIsToggling(true);
        try {
            await onToggle();
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className={styles.visibilityContainer}>
            <button
                className={`${styles.visibilityToggle} ${is_public ? styles.publicToggle : styles.privateToggle} ${canToggle ? styles.canToggle : styles.readOnly}`}
                onClick={handleToggle}
                disabled={!canToggle || isToggling}
                aria-label={`Content is ${is_public ? 'public' : 'private'}${canToggle ? '. Click to toggle' : ''}`}
                title={canToggle ? `Click to make ${is_public ? 'private' : 'public'}` : `Content is ${is_public ? 'public' : 'private'}`}
            >
                <span className={styles.visibilityIcon}>
                    {is_public ? '🌐' : '🔒'}
                </span>
                <span className={styles.visibilityLabel}>
                    {is_public ? 'Public' : 'Private'}
                </span>
                {canToggle && (
                    <span className={styles.toggleHint}>
                        {isToggling ? '...' : '↻'}
                    </span>
                )}
            </button>
            {canToggle && (
                <span className={styles.visibilityHelp}>
                    {is_public ? 
                        'Visible to everyone' : 
                        isTeacher ? 'Only visible to you, students of the class and admins' : 'Limited Visibility'}
                </span>
            )}
        </div>
    );
};

// Raw view toggle button
const RawViewToggle = ({ showRaw, onToggle }) => (
    <button
        className={`${styles.rawViewToggle} ${showRaw ? styles.rawViewActive : ''}`}
        onClick={onToggle}
        aria-label={showRaw ? 'Show formatted view' : 'Show raw content'}
        title={showRaw ? 'Show formatted view' : 'Show raw content'}
    >
        {showRaw ? '📄' : '📝'}
    </button>
);

// Improved content parsers
const parseContentData = (content_data) => {
    try {
        return JSON.parse(content_data);
    } catch {
        return content_data;
    }
};

const RestrictedContentPreview = ({ data, contentType, onPurchase, price, paymentStatus }) => {
    const title        = data.title || 'Content Available';
    const originalType = data.originalType || contentType || 'content';
    const isPaidContent = price && parseFloat(price) > 0;
    
    return (
        <div className={styles.restrictedPreview}>
            <div className={styles.previewHeader}>
                <span className={styles.contentTypeIcon}>
                    {originalType === 'file' ? '📎' : '📄'}
                </span>
                <h4 className={styles.previewTitle}>{title}</h4>
                <span className={styles.restrictedBadge}>🔒 Restricted</span>
            </div>
            
            <div className={styles.previewContent}>
                <p className={styles.restrictedMessage}>
                    This {originalType} content requires payment to access.
                </p>
                
                {isPaidContent ? (
                    <div className={styles.priceInfo}>
                        <span className={styles.priceTag}>Price: Rs. {parseFloat(price).toFixed(2)}</span>
                    </div>
                ) : null}
                
                {/* Payment status display */}
                {paymentStatus && paymentStatus.hasPayment ? (
                    <div className={styles.paymentStatus}>
                        <span className={`${styles.statusBadge} ${styles[paymentStatus.payment.status]}`}>
                            Payment {paymentStatus.payment.status.toUpperCase()}
                            {paymentStatus.payment.status === 'pending' && ' - Under Review'}
                        </span>
                        {paymentStatus.payment.admin_notes && (
                            <p className={styles.adminNotes}>
                                Admin Note: {paymentStatus.payment.admin_notes}
                            </p>
                        )}
                    </div>
                ) : null}
                
                <div className={styles.previewActions}>
                    {isPaidContent && (!paymentStatus?.hasPayment || paymentStatus.payment.status === 'rejected') ? (
                        <button 
                            className={styles.purchaseButton}
                            onClick={onPurchase}
                        >
                            Purchase Access - Rs. {parseFloat(price).toFixed(2)}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

const TextContent = ({ data, showRaw, onToggleRaw, isPreview, onPurchase, price, paymentStatus }) => {
    if (isPreview) {
        return <RestrictedContentPreview 
            data={data} 
            contentType="text" 
            onPurchase={onPurchase}
            price={price}
            paymentStatus={paymentStatus}
        />;
    }
    
    const textContent = typeof data === 'string' ? data : data.text ;
    
    return (
        <div className={styles.textContentContainer}>
            <div className={styles.textContentHeader}>
                <RawViewToggle showRaw={showRaw} onToggle={onToggleRaw} />
                {data.title ? <h1> {data.title } </h1> : null }
            </div>
            <MarkdownContent 
                content={textContent}
                className={styles.textContent}
                showRaw={showRaw}
            />
        </div>
    );
};

const FileContent = ({ content, allowPublicAccess, isPreview, onPurchase, price, paymentStatus }) => {
    if (isPreview) {
        const data = parseContentData(content.content_data);
        return <RestrictedContentPreview 
            data={data} 
            contentType="file" 
            onPurchase={onPurchase}
            price={price}
            paymentStatus={paymentStatus}
        />;
    }
    
    return (
        <SecureFileViewer
            content={content}
            className={styles.fileContent}
            allowPublicAccess={allowPublicAccess}
        />
    );
};

const DefaultContent = ({ content_data, showRaw, onToggleRaw, isPreview, onPurchase, price, paymentStatus }) => {
    if (isPreview) {
        const data = parseContentData(content_data);
        return <RestrictedContentPreview 
            data={data} 
            contentType="content" 
            onPurchase={onPurchase}
            price={price}
            paymentStatus={paymentStatus}
        />;
    }
    
    return (
        <div className={styles.defaultContentContainer}>
            <div className={styles.defaultContentHeader}>
                <RawViewToggle showRaw={showRaw} onToggle={onToggleRaw} />
            </div>
            <MarkdownContent 
                content={content_data}
                className={styles.defaultContent}
                showRaw={showRaw}
            />
        </div>
    );
};

export const ContentRenderer = ({ 
    content, 
    allowPublicAccess = false, 
    onPurchaseContent = null,
    entityType = 'content',
    entityId = null
}) => {
    const [showRaw,       setShowRaw]       = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);
    
    if (!content) return null;
    
    const toggleRaw = () => setShowRaw(!showRaw);
    
    // Check if this is a preview (restricted content)
    const data           = parseContentData(content?.content_data || content);
    const isPreview      = data && (data.preview === true || data.restricted === true);
    const hasAccess      = content.user_has_access !== 0;
    const isPaidContent  = content.price && parseFloat(content.price) > 0;
    const showRestricted = isPreview || !hasAccess;
    
    // Fetch payment status for paid content
    useEffect(() => {
        if (isPaidContent && showRestricted && content.content_id) {
            fetchPaymentStatus();
        }
    }, [isPaidContent, showRestricted, content.content_id]);
    
    const fetchPaymentStatus = async () => {
        try {
            const response = await fetch(`/api/contentPayment?content_id=${content.content_id}`);
            if (response.ok) {
                const status = await response.json();
                setPaymentStatus(status);
            }
        } catch (error) {
            console.error('Error fetching payment status:', error);
        }
    };
    
    // Create purchase handler
    const handlePurchase = onPurchaseContent ? 
        () => onPurchaseContent(content) : 
        null;
    
    switch (content.content_type) {
        case 'text':
            return (
                <TextContent 
                    data={data} 
                    showRaw={showRaw} 
                    onToggleRaw={toggleRaw}
                    isPreview={showRestricted}
                    onPurchase={handlePurchase}
                    price={content.price}
                    paymentStatus={paymentStatus}
                />
            );
        case 'file':
            return (
                <FileContent 
                    content={content} 
                    allowPublicAccess={allowPublicAccess}
                    isPreview={showRestricted}
                    onPurchase={handlePurchase}
                    price={content.price}
                    paymentStatus={paymentStatus}
                />
            );
        default:
            return (
                <DefaultContent 
                    content_data={content.content_data} 
                    showRaw={showRaw} 
                    onToggleRaw={toggleRaw}
                    isPreview={showRestricted}
                    onPurchase={handlePurchase}
                    price={content.price}
                    paymentStatus={paymentStatus}
                />
            );
    }
};

// Improved content metadata with better layout
const ContentMeta = ({ created_at, is_public, onToggleVisibility, canToggle, isTeacher }) => (
    <div className={styles.contentMeta}>
        <div className={styles.metaInfo}>
            <span className={styles.timestamp}>
                {new Date(created_at).toLocaleString()}
            </span>
        </div>
        <VisibilityBadge 
            is_public={is_public} 
            onToggle={onToggleVisibility}
            canToggle={canToggle}
            isTeacher={isTeacher}
        />
    </div>
);

// Improved delete button with better accessibility
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
            className={`${styles.deleteButton} ${isDeleting ? styles.deleting : ''}`}
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete content"
            title="Delete this content"
        >
            {isDeleting ? '⏳' : '❌'}
        </button>
    );
};

// Improved content actions with better organization
const ContentActions = ({ content, isTeacher, currentUser, onDelete, onToggleVisibility }) => {
    const canToggle = isTeacher || (currentUser?.level === 2);
    const canDelete = isTeacher || (currentUser?.level === 2);
    
    return (
        <div className={styles.contentActions}>
            <ContentMeta 
                created_at={content.created_at} 
                is_public={content.is_public}
                onToggleVisibility={() => onToggleVisibility(content.content_id)}
                canToggle={canToggle}
                isTeacher={isTeacher}
            />
            {canDelete && (
                <DeleteButton 
                    onDelete={onDelete} 
                    contentId={content.content_id} 
                />
            )}
        </div>
    );
};

// Main content item with improved hover states and accessibility
export const ContentItem = ({ 
    content, 
    isTeacher, 
    onDelete, 
    currentUser, 
    onToggleVisibility, 
    onPurchaseContent,
    entityType,
    entityId
}) => (
    <article className={styles.contentItem}>
        <div className={styles.contentBody}>
            <ContentRenderer 
                content={content} 
                onPurchaseContent={onPurchaseContent}
                entityType={entityType}
                entityId={entityId}
            />
        </div>
        <ContentActions 
            content={content} 
            isTeacher={isTeacher} 
            currentUser={currentUser} 
            onDelete={onDelete} 
            onToggleVisibility={onToggleVisibility}
        />
    </article>
);

export const ContentList = ({ 
    contents, 
    isTeacher, 
    onDelete, 
    currentUser, 
    onToggleVisibility, 
    onPurchaseContent,
    entityType,
    entityId
}) => (
    <div className={styles.contentList}>
        {contents.map((content) => (
            <ContentItem
                key={content.content_id}
                content={content}
                isTeacher={isTeacher}
                currentUser={currentUser}
                onDelete={onDelete}
                onToggleVisibility={onToggleVisibility}
                onPurchaseContent={onPurchaseContent}
                entityType={entityType}
                entityId={entityId}
            />
        ))}
    </div>
);
