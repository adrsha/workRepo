import React, { useState } from 'react';
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

// Improved content parsers remain the same
const parseContentData = (content_data) => {
    try {
        return JSON.parse(content_data);
    } catch {
        return content_data;
    }
};

const TextContent = ({ data, showRaw, onToggleRaw }) => {
    const textContent = typeof data === 'string' ? data : data.text;
    
    return (
        <div className={styles.textContentContainer}>
            <div className={styles.textContentHeader}>
                <RawViewToggle showRaw={showRaw} onToggle={onToggleRaw} />
            </div>
            <MarkdownContent 
                content={textContent}
                className={styles.textContent}
                showRaw={showRaw}
            />
        </div>
    );
};

const FileContent = ({ content, allowPublicAccess }) => (
    <SecureFileViewer
        content={content}
        className={styles.fileContent}
        allowPublicAccess={allowPublicAccess}
    />
);

const DefaultContent = ({ content_data, showRaw, onToggleRaw }) => {
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

export const ContentRenderer = ({ content, allowPublicAccess = false }) => {
    const [showRaw, setShowRaw] = useState(false);
    
    if (!content) return null;
    
    const toggleRaw = () => setShowRaw(!showRaw);
    switch (content.content_type) {
        case 'text':
            const data = parseContentData(content.content_data);
            return <TextContent data={data} showRaw={showRaw} onToggleRaw={toggleRaw} />;
        case 'file':
            return <FileContent content={content} allowPublicAccess={allowPublicAccess}/>;
        default:
            return <DefaultContent content_data={content.content_data} showRaw={showRaw} onToggleRaw={toggleRaw} />;
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
export const ContentItem = ({ content, isTeacher, onDelete, currentUser, onToggleVisibility }) => (
    <article className={styles.contentItem}>
        <div className={styles.contentBody}>
            <ContentRenderer content={content} />
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

export const ContentList = ({ contents, isTeacher, onDelete, currentUser, onToggleVisibility }) => (
    <div className={styles.contentList}>
        {contents.map((content) => (
            <ContentItem
                key={content.content_id}
                content={content}
                isTeacher={isTeacher}
                currentUser={currentUser}
                onDelete={onDelete}
                onToggleVisibility={onToggleVisibility}
            />
        ))}
    </div>
);
