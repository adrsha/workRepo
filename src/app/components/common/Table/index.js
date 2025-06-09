// Table/index.js - Enhanced Table Component with File Upload Support
import { useState } from 'react';
import "../../innerStyles/Table.css"
import { getCols } from '../../../lib/utils';
import { SYSTEM_FIELDS, isSystemField, getEditableFields } from './utils';
import { TableActions } from './TableActions';
import { TableGrid } from './TableGrid';
import { AddRecordForm } from './forms/AddRecordForm';
import { BulkAddForm } from './forms/BulkAddForm';
import TeacherVideoUpload from '../../teacherUpload';

export const Table = ({ 
    data, 
    className = '', 
    renderCell, 
    additionalColumns = [],
    keyField = 'id',
    allowAdd = false,
    allowDelete = false,
    allowBulkAdd = false,
    allowBulkDelete = false,
    onAdd,
    onDelete,
    onBulkAdd,
    onBulkDelete,
    requiredFields = [],
    tableName = '',
    // renderFormField,
    dropdownOptions = {},
    uploadEndpoints = {} // New prop for file upload endpoints
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [selectedRows, setSelectedRows] = useState(new Set());

    const columns = data?.length ? getCols(data) : [];
    const editableFields = getEditableFields(columns);
    const editableRequiredFields = requiredFields.filter(field => !isSystemField(field));

    // Enhanced renderFormField with file upload support
    const enhancedRenderFormField = (field, value, onChange, options) => {
        // Handle file upload fields
        let caption = '';
        if (field === 'video_path' || field === 'certificate_path') {
            return (
                <div>Need to first create the ID</div>
                // <TeacherVideoUpload />
            );
        }
        
        if (field === 'user_passkey'){
            caption = "Make sure to encrypt this!"
        }
        // Use custom renderFormField if provided
        // if (renderFormField) {
        //     return renderFormField(field, value, onChange, options);
        // }
        
        // Default rendering for other fields
        return (<>
            <span>{caption}</span>
            <input
                type={getInputType(field)}
                onChange={(e) => onChange(e.target)}
                className="form-input"
                placeholder={getPlaceholder(field)}
            />
            </>
        );
    };

    const handleAdd = (formData) => {
        onAdd(formData);
        setShowAddForm(false);
    };

    const handleBulkAdd = (formData) => {
        onBulkAdd(formData);
        setShowBulkForm(false);
    };

    const handleSelectAll = (checked) => {
        setSelectedRows(checked ? new Set(data.map(item => item[keyField])) : new Set());
    };

    const handleRowSelect = (id, checked) => {
        const newSelection = new Set(selectedRows);
        checked ? newSelection.add(id) : newSelection.delete(id);
        setSelectedRows(newSelection);
    };

    const handleBulkDelete = () => {
        if (selectedRows.size > 0 && onBulkDelete) {
            onBulkDelete(Array.from(selectedRows));
            setSelectedRows(new Set());
        }
    };

    if (!data?.length) {
        return null;
    }

    return (
        <div className="table-container scrollable">
            <TableActions
                allowAdd={allowAdd}
                allowBulkAdd={allowBulkAdd}
                allowBulkDelete={allowBulkDelete}
                selectedCount={selectedRows.size}
                onShowAdd={() => setShowAddForm(true)}
                onShowBulkAdd={() => setShowBulkForm(true)}
                onBulkDelete={handleBulkDelete}
            />
            
            <TableGrid
                data={data}
                columns={editableFields}
                additionalColumns={additionalColumns}
                className={className}
                renderCell={renderCell}
                keyField={keyField}
                allowDelete={allowDelete}
                allowBulkDelete={allowBulkDelete}
                selectedRows={selectedRows}
                onRowSelect={handleRowSelect}
                onSelectAll={handleSelectAll}
                onDelete={onDelete}
            />

            {showAddForm && (
                <AddRecordForm
                    fields={editableFields}
                    requiredFields={editableRequiredFields}
                    onSave={handleAdd}
                    onCancel={() => setShowAddForm(false)}
                    tableName={tableName}
                    renderFormField={enhancedRenderFormField}
                    dropdownOptions={dropdownOptions}
                />
            )}

            {showBulkForm && (
                <BulkAddForm
                    fields={editableFields}
                    requiredFields={editableRequiredFields}
                    onSave={handleBulkAdd}
                    onCancel={() => setShowBulkForm(false)}
                    tableName={tableName}
                    renderFormField={enhancedRenderFormField}
                    dropdownOptions={dropdownOptions}
                />
            )}
        </div>
    );
};

// Helper functions
const getInputType = (field) => {
    if (field.includes('email')) return 'email';
    if (field.includes('date')) return 'date';
    if (field.includes('phone') || field.includes('contact')) return 'tel';
    if (field.includes('password') || field.includes('passkey')) return 'password';
    return 'text';
};

const getPlaceholder = (field) => {
    const placeholders = {
        user_name: 'Enter full name',
        user_email: 'Enter email address',
        contact: 'Enter phone number',
        address: 'Enter address',
        experience: 'Years of experience',
        qualification: 'Educational qualification',
        guardian_name: 'Guardian name',
        guardian_contact: 'Guardian phone',
        school: 'School name',
        class: 'Class/Grade'
    };
    return placeholders[field] || `Enter ${field.replace(/_/g, ' ')}`;
};
