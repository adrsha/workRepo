// Table/index.js - Fixed AddRecordForm call with fieldMappings
import { useState } from 'react';
import "../../innerStyles/Table.css"
import { getCols, formatColName } from '../../../lib/utils';
import { SYSTEM_FIELDS, isSystemField, getEditableFields } from './utils';
import { createFieldRenderer } from '../fieldRendererFactory.js';
import { TableActions } from './TableActions';
import { TableGrid } from './TableGrid';
import { AddRecordForm } from './forms/AddRecordForm';
import { BulkAddForm } from './forms/BulkAddForm';

const DISALLOWED_COLUMNS = ["user_level"];

// Input type helpers
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

export const Table = ({
    data = [],
    schema = {},
    className = '',
    renderCell,
    fieldMappings = {},
    dependencies = {},
    handlers = {},
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
    hiddenColumns = [],
    showColumnToggle = false
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [userHiddenColumns, setUserHiddenColumns] = useState(new Set(hiddenColumns));

    // Remove disallowed columns
    const cleanedData = data.map(row => {
        const cleanRow = { ...row };
        DISALLOWED_COLUMNS.forEach(col => delete cleanRow[col]);
        return cleanRow;
    });
    const cleanedCols = schema.columns.filter(col => !DISALLOWED_COLUMNS.includes(col))
    // const allColumns = cleanedData?.length ? getCols(cleanedData) : [];
    const allColumns = cleanedCols;
    const editableFields = getEditableFields(allColumns);
    const editableRequiredFields = requiredFields.filter(field => !isSystemField(field));
    const visibleEditableFields = editableFields.filter(field => !userHiddenColumns.has(field));

    // Enhanced form field renderer that uses the new schema
    const enhancedRenderFormField = (field, value, onChange, options) => {
        // Special cases
        if (field === 'video_path' || field === 'certificate_path') {
            return <div>Need to first create the ID</div>;
        }

        let caption = '';
        if (field === 'user_passkey') {
            caption = "Make sure to encrypt this!";
        }

        // Use renderCell if available with new schema
        if (renderCell && fieldMappings[field]) {
            const mockItem = { [field]: value, isFormMode: true };
            try {
                return renderCell(mockItem, field, { 
                    onChange,
                    options,
                    dependencies,
                    handlers
                });
            } catch (error) {
                console.warn(`Field renderer failed for ${field}, falling back to default`);
            }
        }

        // Fallback to default input
        return (
            <>
                {caption && <span className="field-caption">{caption}</span>}
                <input
                    type={getInputType(field)}
                    value={value || ''}
                    onChange={(e) => onChange(field, e.target.value)}
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
        setSelectedRows(checked ? new Set(cleanedData.map(item => item[keyField])) : new Set());
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

    // Column visibility handlers
    const toggleColumnVisibility = (columnName) => {
        const newHiddenColumns = new Set(userHiddenColumns);
        if (newHiddenColumns.has(columnName)) {
            newHiddenColumns.delete(columnName);
        } else {
            newHiddenColumns.add(columnName);
        }
        setUserHiddenColumns(newHiddenColumns);
    };

    const showAllColumns = () => setUserHiddenColumns(new Set());

    const hideAllNonEssentialColumns = () => {
        const essentialColumns = [keyField, 'name', 'user_name', 'title', 'email', 'user_email'];
        const columnsToHide = allColumns.filter(col => !essentialColumns.includes(col));
        setUserHiddenColumns(new Set(columnsToHide));
    };

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
                data={cleanedData}
                columns={visibleEditableFields}
                allColumns={allColumns}
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
                    createFieldRenderer={createFieldRenderer}
                    fieldMappings={fieldMappings}  // Added this
                    dependencies={dependencies}    // Added this
                />
            )}

            {showBulkForm && (
                <BulkAddForm
                    fields={editableFields}
                    requiredFields={editableRequiredFields}
                    onSave={handleBulkAdd}
                    onCancel={() => setShowBulkForm(false)}
                    createFieldRenderer={createFieldRenderer}
                    tableName={tableName}
                    renderFormField={enhancedRenderFormField}
                    dropdownOptions={dropdownOptions}
                    fieldMappings={fieldMappings}  // You might want to add this too
                    dependencies={dependencies}    // And this
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
                                    {formatColName(column)}
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
