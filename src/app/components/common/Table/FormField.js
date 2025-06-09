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
    // If a custom form field renderer is provided, use it
    if (renderFormField) {
        const customField = renderFormField(field, value, onChange, { error, required });
        if (customField) {
            return (
                <div className="form-field">
                    <label>
                        {formatColName(field)}
                        {required && <span className="required">*</span>}
                    </label>
                    {customField}
                    {error && <span className="error-message">{error}</span>}
                </div>
            );
        }
    }

    // Default fallback to basic input
    return (
        <div className="form-field">
            <label>
                {formatColName(field)}
                {required && <span className="required">*</span>}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(field, e.target.value)}
                className={error ? 'error' : ''}
                placeholder={`Enter ${formatColName(field).toLowerCase()}`}
            />
            {error && <span className="error-message">{error}</span>}
        </div>
    );
};
