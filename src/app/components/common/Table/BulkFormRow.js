import { FormField } from './FormField';

export const BulkFormRow = ({ 
    rowIndex, 
    row, 
    fields, 
    requiredFields, 
    onUpdateField, 
    onRemoveRow, 
    canRemove,
    errors,
    renderFormField,
    dropdownOptions
}) => (
    <div className="bulk-row">
        <div className="bulk-row-header">
            <span className="row-number">Row {rowIndex + 1}</span>
            {canRemove && (
                <button
                    type="button"
                    onClick={() => onRemoveRow(rowIndex)}
                    className="remove-row-btn"
                    title="Remove this row"
                >
                    ×
                </button>
            )}
        </div>
            
        <div className="bulk-row-fields">
            {fields.map(field => (
                <FormField
                    key={field}
                    field={field}
                    value={row[field] || ''}
                    onChange={onUpdateField.bind(null, rowIndex)}
                    error={errors[`${rowIndex}-${field}`]}
                    required={requiredFields.includes(field)}
                    renderFormField={renderFormField}
                    dropdownOptions={dropdownOptions}
                />
            ))}
        </div>
    </div>
);
