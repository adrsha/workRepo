import { useState } from 'react';
import { createEmptyRow } from '../utils';
import { BulkFormRow } from '../BulkFormRow';

export const BulkAddForm = ({ 
    fields, 
    requiredFields, 
    onSave, 
    onCancel, 
    tableName,
    createFieldRenderer,
    fieldMappings = {},
    dependencies = {},
    dropdownOptions // Keep for backward compatibility
}) => {
    const [rows, setRows] = useState([createEmptyRow(fields)]);
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState({});
    const [uploadedFiles, setUploadedFiles] = useState({});

    const addRow = () => setRows(prev => [...prev, createEmptyRow(fields)]);

    const removeRow = (index) => {
        if (rows.length > 1) {
            setRows(prev => prev.filter((_, i) => i !== index));
            const newErrors = { ...errors };
            const newUploading = { ...uploading };
            const newUploadedFiles = { ...uploadedFiles };
            
            Object.keys(newErrors).forEach(key => {
                if (key.startsWith(`${index}-`)) {
                    delete newErrors[key];
                }
            });
            Object.keys(newUploading).forEach(key => {
                if (key.startsWith(`${index}-`)) {
                    delete newUploading[key];
                }
            });
            Object.keys(newUploadedFiles).forEach(key => {
                if (key.startsWith(`${index}-`)) {
                    delete newUploadedFiles[key];
                }
            });
            
            setErrors(newErrors);
            setUploading(newUploading);
            setUploadedFiles(newUploadedFiles);
        }
    };

    const updateRowField = (rowIndex, field, value) => {
        setRows(prev => prev.map((row, index) => 
            index === rowIndex ? { ...row, [field]: value } : row
        ));
        
        const errorKey = `${rowIndex}-${field}`;
        if (errors[errorKey]) {
            setErrors(prev => ({ ...prev, [errorKey]: null }));
        }
    };

    const handleFileUpload = async (rowIndex, field, file, uploadEndpoint = '/api/teacherUpload') => {
        if (!file) return;

        const uploadKey = `${rowIndex}-${field}`;
        setUploading(prev => ({ ...prev, [uploadKey]: true }));
        setErrors(prev => ({ ...prev, [uploadKey]: null }));

        try {
            const formData = new FormData();
            formData.append(field === 'video_path' ? 'video' : 'certificate', file);

            const response = await fetch(uploadEndpoint, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            updateRowField(rowIndex, field, result.filePath || result.path);
            
            setUploadedFiles(prev => ({ 
                ...prev, 
                [uploadKey]: { 
                    name: file.name, 
                    path: result.filePath || result.path 
                } 
            }));

        } catch (err) {
            setErrors(prev => ({ 
                ...prev, 
                [uploadKey]: err.message || 'Upload failed' 
            }));
        } finally {
            setUploading(prev => ({ ...prev, [uploadKey]: false }));
        }
    };

    const createRowFieldRenderer = (rowIndex) => {
        if (!createFieldRenderer) {
            // Fallback to simple rendering
            return (field, value, onChange) => (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(field, e.target.value)}
                    className="form-input"
                />
            );
        }

        // Create a mock item for this row with form mode enabled
        const mockItem = { ...rows[rowIndex], isFormMode: true };
        
        // Create handlers for this specific row
        const mockHandlers = {
            onSaveData: () => {},
            onMultiSaveData: () => {},
            onChange: (field, value) => updateRowField(rowIndex, field, value)
        };

        // Get the field renderer function
        const fieldRenderer = createFieldRenderer(fieldMappings, dependencies, mockHandlers);
        
        // Return a function that renders fields for this row
        return (field, value, onChange) => {
            const errorKey = `${rowIndex}-${field}`;
            const options = { 
                error: errors[errorKey],
                className: errors[errorKey] ? 'error' : ''
            };
            
            return fieldRenderer(mockItem, field, onChange, options);
        };
    };

    const validateRows = () => {
        const newErrors = {};
        rows.forEach((row, rowIndex) => {
            requiredFields.forEach(field => {
                // Skip file fields from required validation as they might be optional
                if (field === 'video_path' || field === 'certificate_path') {
                    return;
                }
                
                if (!row[field]?.toString().trim()) {
                    newErrors[`${rowIndex}-${field}`] = 'This field is required';
                }
            });
        });
        setErrors(prev => ({ ...prev, ...newErrors }));
        return !Object.keys(newErrors).length;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const hasUploading = Object.values(uploading).some(status => status);
        if (hasUploading) {
            alert('Please wait for all file uploads to complete');
            return;
        }
        
        if (validateRows()) {
            const validRows = rows.filter(row => 
                Object.values(row).some(value => value?.toString().trim())
            );
            if (validRows.length > 0) {
                console.log("BULK", validRows);
                onSave(validRows);
            }
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content bulk-modal">
                <div className="modal-header">
                    <h3>Bulk Add {tableName || 'Records'}</h3>
                    <span className="row-count">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="bulk-content">
                        <button type="button" onClick={addRow} className="add-row-btn">
                            + Add Row
                        </button>

                        <div className="bulk-rows">
                            {rows.map((row, rowIndex) => (
                                <BulkFormRow
                                    key={rowIndex}
                                    rowIndex={rowIndex}
                                    row={row}
                                    fields={fields}
                                    requiredFields={requiredFields}
                                    onUpdateField={updateRowField}
                                    onRemoveRow={removeRow}
                                    canRemove={rows.length > 1}
                                    errors={errors}
                                    renderFormField={createRowFieldRenderer(rowIndex)}
                                    dropdownOptions={dropdownOptions}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button 
                            type="submit" 
                            className="save-btn"
                            disabled={Object.values(uploading).some(status => status)}
                        >
                            {Object.values(uploading).some(status => status) 
                                ? 'Uploading...' 
                                : `Add ${rows.length} Record${rows.length !== 1 ? 's' : ''}`
                            }
                        </button>
                        <button type="button" className="cancel-btn" onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
