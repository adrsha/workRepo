import { useState } from 'react';
import { FormField } from '../FormField';

export const AddRecordForm = ({ 
    fields, 
    requiredFields, 
    onSave, 
    onCancel, 
    tableName,
    renderFormField,
    dropdownOptions
}) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    const handleInputChange = (field) => {
        const value = field.value;
        setFormData(prev => ({ ...prev, [field]: value }));
        console.log("Field", field, value)
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

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Add New {tableName || 'Record'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-content">
                        {fields.map(field => (
                            <FormField
                                key={field}
                                field={field}
                                value={formData[field] || ''}
                                onChange={handleInputChange}
                                error={errors[field]}
                                required={requiredFields.includes(field)}
                                renderFormField={renderFormField}
                                dropdownOptions={dropdownOptions}
                            />
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
