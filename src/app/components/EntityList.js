import styles from '@/styles/EntityList.module.css';
import { toSingular }  from '@/utils/entityUtils';

// Generic List Component
export const EntityList = ({
    entities,
    entityType,
    isAdmin,
    onDelete,
    viewedEntities = new Set(),
    onEntityClick
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    const getEntityId = (entity) => {
        return entity[`${toSingular(entityType)}_id`]
    };
    const getEntityTitle = (entity) => entity[`${toSingular(entityType)}_title`];
    const getEntityDate = (entity) => entity[`${toSingular(entityType)}_date_time`];

    const isEntityNew = (entityId) => !viewedEntities.has(entityId);

    const sortedEntities = [...entities].sort((a, b) => {
        return new Date(getEntityDate(b)) - new Date(getEntityDate(a));
    });

    if (entities.length === 0) {
        return (
            <div className={styles.emptyState}>
                No {entityType} found
            </div>
        );
    }

    return (
        <div className={styles.entitiesList}>
            {sortedEntities.map((entity) => {
                const entityId = getEntityId(entity);
                const isNew = isEntityNew(entityId);
                return (
                    <div className={styles.entityContainer} key={entityId}>
                        <a
                            className={styles.entityLink}
                            href={`/${entityType}/${entityId}`}
                            onClick={() => onEntityClick?.(entityId)}
                        >
                            <div className={`${styles.entityCard} ${isNew ? styles.newEntity : ''}`}>
                                <div className={styles.entityHeader}>
                                    <h3 className={styles.entityTitle}>
                                        {getEntityTitle(entity)}
                                        {isNew && <span className={styles.newBadge}>NEW</span>}
                                    </h3>
                                    <span className={styles.entityDate}>
                                        {formatDate(getEntityDate(entity))}
                                    </span>
                                </div>
                            </div>
                        </a>
                        {isAdmin && (
                            <button
                                className={styles.deleteButton}
                                onClick={() => onDelete(entityId)}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
