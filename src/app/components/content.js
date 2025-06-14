import styles from '../../styles/ClassContent.module.css';
import SecureFileViewer from './SecureFileViewer';
import { MarkdownContent } from '../../utils/markdown';

export const VisibilityBadge = ({ is_public }) => (
    <span className={`${styles.visibilityBadge} ${is_public ? styles.publicBadge : styles.privateBadge}`}>
        {is_public ? 'Public' : 'Private'}
    </span>
);

const parseContentData = (content_data) => {
    try {
        return JSON.parse(content_data);
    } catch {
        return content_data;
    }
};

const TextContent = ({ data }) => {
    // Handle both old format (data.text) and new format (direct string)
    const textContent = typeof data === 'string' ? data : data.text;
    
    return (
        <MarkdownContent 
            content={textContent}
            className={styles.textContent}
        />
    );
};

const FileContent = ({ content }) => (
    <SecureFileViewer
        content={content}
        className={styles.fileContent}
    />
);

const DefaultContent = ({ content_data }) => {
    // Also apply markdown parsing to default content
    return (
        <MarkdownContent 
            content={content_data}
            className={styles.defaultContent}
        />
    );
};

export const ContentRenderer = ({ content }) => {
    if (!content) return null;
    
    switch (content.content_type) {
        case 'text':
            const data = parseContentData(content.content_data);
            return <TextContent data={data} />;
        case 'file':
            return <FileContent content={content} />;
        default:
            return <DefaultContent content_data={content.content_data} />;
    }
};

const ContentMeta = ({ created_at, is_public }) => (
    <div className={styles.contentMeta}>
        <span className={styles.content_data}>
            {new Date(created_at).toLocaleString()}
        </span>
        <VisibilityBadge is_public={is_public} />
    </div>
);

const DeleteButton = ({ onDelete, contentId }) => (
    <button
        className={styles.deleteButton}
        onClick={() => onDelete(contentId)}
        aria-label="Delete content"
    >
        ✕
    </button>
);

const ContentActions = ({ content, isTeacher, onDelete }) => (
    <div className={styles.contentActions}>
        <ContentMeta created_at={content.created_at} is_public={content.is_public} />
        {isTeacher && <DeleteButton onDelete={onDelete} contentId={content.content_id} />}
    </div>
);

export const ContentItem = ({ content, isTeacher, onDelete }) => (
    <div className={styles.contentItem}>
        <ContentRenderer content={content} />
        <ContentActions content={content} isTeacher={isTeacher} onDelete={onDelete} />
    </div>
);

export const ContentList = ({ contents, isTeacher, onDelete }) => (
    <div className={styles.contentList}>
        {contents.map((content) => (
            <ContentItem
                key={content.content_id}
                content={content}
                isTeacher={isTeacher}
                onDelete={onDelete}
            />
        ))}
    </div>
);
