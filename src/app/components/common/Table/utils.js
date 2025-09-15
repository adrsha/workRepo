export const SYSTEM_FIELDS = ['id', 'user_id', 'class_id', 'pending_id', 'created_at', 'updated_at'];

export const isSystemField = (field) => {
    return SYSTEM_FIELDS.includes(field);
};

export const isPrimaryKey = (field, keyField) => {
    return field === keyField;
};

export const isFilteredField = (field, keyField = null, excludePrimaryKey = false) => {
    return isSystemField(field) || (excludePrimaryKey && isPrimaryKey(field, keyField));
};

export const getEditableFields = (fields, keyField = null, excludePrimaryKey = false) => {
    return fields.filter(field => !isFilteredField(field, keyField, excludePrimaryKey));
};

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
