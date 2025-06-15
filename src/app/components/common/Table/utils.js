// export const SYSTEM_FIELDS = [];
export const SYSTEM_FIELDS = ['id', 'user_id', 'class_id', 'pending_id', 'created_at', 'updated_at'];

export const isSystemField = (field) => SYSTEM_FIELDS.includes(field);

export const getEditableFields = (fields) => fields.filter(field => !isSystemField(field));

export const createEmptyRow = (fields) => 
    fields.reduce((row, field) => ({ ...row, [field]: '' }), {});

export const createActionButtons = (actions, actionInProgress) => (item, type) => (
    <div className="action-buttons">
        {actions.map(({ text, action, key }) => (
            <button
                key={key}
                className={`${key}-btn action-btn`}
                onClick={() => action(item)}
                disabled={actionInProgress?.[`${type}-${key}-${item.pending_id || item.user_id || item.id}`]}
            >
                {actionInProgress?.[`${type}-${key}-${item.pending_id || item.user_id || item.id}`] ? 'Processing...' : text}
            </button>
        ))}
    </div>
);
