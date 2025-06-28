import { EditableField } from '../EditableField';
import { EditableDropdown } from '../EditableDropdown';
import { EditableStartTime } from '../EditableTimeSchedule';
import { EditableDate } from '../EditableDate';
import { formatColName } from '../../lib/utils';
import FullScreenableImage from '../FullScreenableImage';


// Async handler wrapper for error handling
export const createAsyncHandler = (handler, errorMessage) => async (...args) => {
    try {
        await handler(...args);
    } catch (error) {
        console.error(errorMessage, error);
        // You might want to show a toast/notification here
        throw error;
    }
};

// Confirmation handler wrapper
export const createConfirmHandler = (handler, message) => (...args) => {
    if (window.confirm(message)) {
        return handler(...args);
    }
};
// Core field renderers
const createBaseRenderers = () => ({
    text: (value, onSave, config) => (
        <EditableField
            initialValue={value || ''}
            onSave={onSave}
            placeholder={config.placeholder}
            label={config.label}
            isFormMode={config.isFormMode}
        />
    ),

    dropdown: (value, onSave, config) => (
        <EditableDropdown
            initialValue={value || ''}
            onSave={onSave}
            options={config.options}
            placeholder={config.placeholder}
            label={config.label}
            isFormMode={config.isFormMode}
        />
    ),

    datetime: (value, onSave, config) => (
        <EditableStartTime
            initialDateTime={value || ''}
            onSave={onSave}
            label={config.label}
            isFormMode={config.isFormMode}
        />
    ),

    date: (value, onSave, config) => (
        <EditableDate
            initialDate={value ? value.split('T')[0] : ''}
            onSave={onSave}
            label={config.label}
        />
    ),

    image: (value, onSave, config) => (
        value ? 
            <FullScreenableImage 
                src={value} 
                alt={config.alt || 'image'} 
                className={config.className || 'image'} 
            /> : 
            <EditableField
                initialValue={value || ''}
                onSave={onSave}
                placeholder={config.placeholder}
                label={config.label}
                isFormMode={config.isFormMode}
            />
    ),

    display: (value, config) => (
        <span className={config.className}>
            {value || config.fallback || 'Not provided'}
        </span>
    )
});

// Field configuration factory
const createFieldConfig = (item, col, options = {}) => ({
    label: formatColName(col),
    placeholder: `Enter ${formatColName(col).toLowerCase()}`,
    isFormMode: item.isFormMode,
    ...options
});

// Improved save handler factory that better handles form mode
const createSaveHandler = (item, col, handlers, schemas = {}) => {
    const { onSaveData, onMultiSaveData, onChange } = handlers;

    // In form mode, always use onChange if provided
    if (item.isFormMode && onChange) {
        return (value) => {
            console.log(`Form mode: Setting ${col} to`, value);
            onChange(col, value);
        };
    }

    // For non-form mode (editing existing records)
    const keyField = getKeyField(item);
    if (!keyField || !item[keyField]) {
        console.warn(`No key field found for item:`, item);
        return () => {};
    }

    const isTimeField = ['start_time', 'end_time'].includes(col);
    const tableName = getTableName(schemas, col, item);

    if (isTimeField && onMultiSaveData) {
        return (value) => onMultiSaveData(tableName, item[keyField], { [col]: value });
    }

    return (value) => onSaveData(tableName, item[keyField], col, value);
};

// Main field renderer factory with better debugging
export const createFieldRenderer = (fieldMappings, dependencies, handlers) => {
    const baseRenderers = createBaseRenderers();

    return (item, col, onChange = null, options = {}) => {
        const extendedHandlers = { ...handlers, onChange };
        const onSave = createSaveHandler(item, col, extendedHandlers, dependencies.schemas);
        
        
        const config = createFieldConfig(item, col, {
            ...options,
            error: options.error // Make sure error gets passed through
        });

        // Check for custom field mapping
        const customMapping = fieldMappings[col];
        // console.log("customMapping", fieldMappings);
        if (customMapping) {
            return customMapping(item, onSave, config, dependencies, baseRenderers);
        }

        // Default to text field
        return baseRenderers.text(item[col], onSave, config);
    };
};

// Utility functions
const getKeyField = (item) => {
    if (item.class_id !== undefined) return 'class_id';
    if (item.user_id !== undefined) return 'user_id';
    if (item.pending_id !== undefined) return 'pending_id';
    return null;
};

const getTableName = (schemas, col, item) => {
    if (schemas && Object.keys(schemas).length > 0) {
        for (const [tableName, schema] of Object.entries(schemas)) {
            if (schema.columns?.includes(col)) return tableName;
        }
    }

    // Fallback logic
    if (item.class_id !== undefined) return 'classes';
    if (item.pending_id !== undefined) return 'pending_teachers';
    return 'users';
};


// Utility to create options for dropdowns
export const createOptions = (data, valueKey, labelKey) =>
    data?.map(item => ({ 
        value: item[valueKey], 
        label: item[labelKey] 
    })) || [];
