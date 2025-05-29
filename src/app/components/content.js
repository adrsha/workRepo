import styles from '../../styles/ClassContent.module.css';
import SecureFileViewer from './SecureFileViewer';

// ============== CONTENT COMPONENTS ==============
// components/content/VisibilityBadge.js
export const VisibilityBadge = ({ isPublic }) => (
    <span className={`${styles.visibilityBadge} ${isPublic ? styles.publicBadge : styles.privateBadge}`}>
        {isPublic ? 'Public' : 'Private'}
    </span>
);


// components/content/ContentRenderer.js
export const ContentRenderer = ({ content }) => {

    if (!content) return null;
    switch (content.content_type) {
        case 'text':
            const data = JSON.parse(content.content_data);
            return (
                <div className={styles.textContent}>
                    {data.text}
                </div>
            );
        case 'file':
            console.log(content);
            return (
                <SecureFileViewer
                    content={content}
                    className={styles.fileContent}
                />
            );
        default:
            return <div>{content.content_data}</div>;
    }
};

// components/content/ContentItem.js
// import { ContentRenderer } from './ContentRenderer';
// import { VisibilityBadge } from './VisibilityBadge';

export const ContentItem = ({ content, isTeacher, onDelete }) => (
    <div className={styles.contentItem}>
        <ContentRenderer content={content} />
        <div className={styles.contentActions}>
            <div className={styles.contentMeta}>
                <span className={styles.contentData}>
                    {new Date(content.created_at).toLocaleString()}
                </span>
                <VisibilityBadge isPublic={content.isPublic} />
            </div>
            {isTeacher && (
                <button
                    className={styles.deleteButton}
                    onClick={() => onDelete(content.content_id)}
                    aria-label="Delete content"
                >
                    ✕
                </button>
            )}
        </div>
    </div>
);

// components/content/ContentList.js
// import { ContentItem } from './ContentItem';

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
