import { formatColName } from '../../../lib/utils';

export const FormField = ({
    field,
    value,
    onChange,
    error,
    required,
    renderFormField,
    dropdownOptions
}) => {
    const fieldLabel = formatColName(field);
    
    // If a custom form field renderer is provided, use it
    if (renderFormField) {
        try {
            const customField = renderFormField(field, value, onChange);
            if (customField) {
                return (
                    <div className="form-field">
                        <label>
                            {fieldLabel}
                            {required && <span className="required">*</span>}
                        </label>
                        <div className={`field-wrapper ${error ? 'error' : ''}`}>
                            {customField}
                        </div>
                        {error && <span className="error-message">{error}</span>}
                    </div>
                );
            }
        } catch (err) {
            console.error(`Error rendering custom field ${field}:`, err);
            // Fall through to default rendering
        }
    }

    // Default fallback to basic input
    return (
        <div className="form-field">
            <label>
                {fieldLabel}
                {required && <span className="required">*</span>}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(field, e.target.value)}
                className={error ? 'error' : ''}
                placeholder={`Enter ${fieldLabel.toLowerCase()}`}
            />
            {error && <span className="error-message">{error}</span>}
        </div>
    );
};
