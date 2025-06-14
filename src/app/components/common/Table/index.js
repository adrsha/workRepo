// Table/index.js - Enhanced Table Component with Column Hiding Support
import { useState } from 'react';
import "../../innerStyles/Table.css"
import { getCols } from '../../../lib/utils';
import { SYSTEM_FIELDS, isSystemField, getEditableFields } from './utils';
import { TableActions } from './TableActions';
import { TableGrid } from './TableGrid';
import { AddRecordForm } from './forms/AddRecordForm';
import { BulkAddForm } from './forms/BulkAddForm';

const DISALLOWED_COLUMNS = ["user_level"]

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
    dropdownOptions = {},
    uploadEndpoints = {},
    hiddenColumns = [], // New prop for columns to hide from display
    showColumnToggle = false // New prop to show/hide column toggle UI
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [userHiddenColumns, setUserHiddenColumns] = useState(new Set(hiddenColumns));
    
    // Remove disallowed columns from data
    DISALLOWED_COLUMNS.forEach(col => {
        data.forEach((row) => {
            delete row[col]
        })
    });

    const allColumns = data?.length ? getCols(data) : [];
    const editableFields = getEditableFields(allColumns);
    const editableRequiredFields = requiredFields.filter(field => !isSystemField(field));
    
    // Filter columns for display (remove hidden ones)
    const visibleColumns = allColumns.filter(col => !userHiddenColumns.has(col));
    const visibleEditableFields = editableFields.filter(field => !userHiddenColumns.has(field));

    // Enhanced renderFormField with file upload support
    const enhancedRenderFormField = (field, value, onChange, options) => {
        let caption = '';
        if (field === 'video_path' || field === 'certificate_path') {
            return (
                <div>Need to first create the ID</div>
            );
        }

        if (field === 'user_passkey') {
            caption = "Make sure to encrypt this!"
        }

        return (
            <>
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

    // Column visibility toggle handlers
    const toggleColumnVisibility = (columnName) => {
        const newHiddenColumns = new Set(userHiddenColumns);
        if (newHiddenColumns.has(columnName)) {
            newHiddenColumns.delete(columnName);
        } else {
            newHiddenColumns.add(columnName);
        }
        setUserHiddenColumns(newHiddenColumns);
    };

    const showAllColumns = () => {
        setUserHiddenColumns(new Set());
    };

    const hideAllNonEssentialColumns = () => {
        const essentialColumns = [keyField, 'name', 'user_name', 'title', 'email', 'user_email'];
        const columnsToHide = allColumns.filter(col => !essentialColumns.includes(col));
        setUserHiddenColumns(new Set(columnsToHide));
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

            {/* Column Toggle Controls */}
            {showColumnToggle && (
                <ColumnToggleControls
                    allColumns={allColumns}
                    hiddenColumns={userHiddenColumns}
                    onToggleColumn={toggleColumnVisibility}
                    onShowAll={showAllColumns}
                    onHideNonEssential={hideAllNonEssentialColumns}
                />
            )}

            <TableGrid
                data={data}
                columns={visibleEditableFields}
                allColumns={allColumns} // Pass all columns for access by other components
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
                    fields={editableFields} // Use all editable fields for forms
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
                    fields={editableFields} // Use all editable fields for forms
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

// Column Toggle Controls Component
const ColumnToggleControls = ({
    allColumns,
    hiddenColumns,
    onToggleColumn,
    onShowAll,
    onHideNonEssential
}) => {
    const [showDropdown, setShowDropdown] = useState(false);

    return (
        <div className="column-toggle-controls">
            <div className="column-toggle-header">
                <button
                    className="toggle-dropdown-btn"
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    Show/Hide Columns ({allColumns.length - hiddenColumns.size}/{allColumns.length})
                </button>
                <div className="quick-actions">
                    <button onClick={onShowAll} className="quick-action-btn">
                        Show All
                    </button>
                    <button onClick={onHideNonEssential} className="quick-action-btn">
                        Hide Non-Essential
                    </button>
                </div>
            </div>
            
            {showDropdown && (
                <div className="column-toggle-dropdown">
                    <div className="column-list">
                        {allColumns.map(column => (
                            <label key={column} className="column-toggle-item">
                                <input
                                    type="checkbox"
                                    checked={!hiddenColumns.has(column)}
                                    onChange={() => onToggleColumn(column)}
                                />
                                <span className="column-name">
                                    {formatColumnName(column)}
                                </span>
                                {hiddenColumns.has(column) && (
                                    <span className="hidden-indicator">(Hidden)</span>
                                )}
                            </label>
                        ))}
                    </div>
                </div>
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
