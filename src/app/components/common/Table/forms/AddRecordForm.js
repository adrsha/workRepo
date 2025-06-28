import { useState } from 'react';

export const AddRecordForm = ({
    fields,
    requiredFields,
    onSave,
    onCancel,
    tableName,
    createFieldRenderer,
    fieldMappings = {},
    dependencies = {}
}) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        requiredFields.forEach(field => {
            if (!formData[field]?.toString().trim()) {
                newErrors[field] = 'This field is required';
            }
        });
        setErrors(newErrors);
        return !Object.keys(newErrors).length;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSave(formData);
        }
    };

    const renderField = (field) => {
        if (!createFieldRenderer) {
            return (
                <input
                    type="text"
                    value={formData[field] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className={`form-input ${errors[field] ? 'error' : ''}`}
                    placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                />
            );
        }

        // Create the mock item with form mode enabled
        const mockItem = { ...formData, isFormMode: true };
        
        // Create mock handlers for the field renderer
        const mockHandlers = {
            onSaveData: () => {},
            onMultiSaveData: () => {},
            onChange: handleInputChange  // This will be used in form mode
        };

        // Get the field renderer function
        const fieldRenderer = createFieldRenderer(fieldMappings, dependencies, mockHandlers);
        
        // Create options with error state
        const options = { 
            error: errors[field],
            className: errors[field] ? 'error' : ''
        };
        
        // Call the field renderer with the correct parameters
        return fieldRenderer(mockItem, field, handleInputChange, options);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Add New {tableName || 'Record'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-content">
                        {fields.map(field => (
                            <div key={field} className="form-field">
                                <label className="form-label">
                                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    {requiredFields.includes(field) && <span className="required">*</span>}
                                </label>
                                {renderField(field)}
                                {errors[field] && (
                                    <span className="error-message">{errors[field]}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="save-btn">Save</button>
                        <button type="button" className="cancel-btn" onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
