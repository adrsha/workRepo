// TableRow.js - Updated with extracted PreviewModal
import { useState } from 'react';
import { PreviewModal } from './PreviewModal';

const PreviewButton = ({ onClick }) => (
    <>
        <label className="editable-field__label">Preview</label>
        <button
            type="button"
            onClick={onClick}
            className="preview-btn"
            title="Preview file"
        >
            👁️
        </button>
    </>
);

export const TableRow = ({
    item,
    index,
    columns, // Only visible columns
    allColumns, // All columns including hidden ones - for data access
    additionalColumns,
    renderCell,
    keyField,
    allowDelete,
    allowBulkDelete,
    isSelected,
    onRowSelect,
    onDelete
}) => {
    const [previewData, setPreviewData] = useState(null);
    
    const handlePreview = (fieldName) => {
        setPreviewData({ fieldName, item });
    };

    const closePreview = () => setPreviewData(null);

    const renderCellContent = (col) => {
        const value = item[col];
        // Handle custom rendering first - pass allColumns for full data access
        if (renderCell) {
            const customContent = renderCell(item, col, index, allColumns);

            // If it's a preview field with value, show preview button
            if (isPreviewableField(col) && hasValue(value)) {
                return <PreviewButton onClick={() => handlePreview(col)} />;
            }

            return customContent;
        }

        // Default handling for preview fields
        if (isPreviewableField(col) && hasValue(value)) {
            return <PreviewButton onClick={() => handlePreview(col)} />;
        }

        // Default cell content
        return value;
    };

    const isPreviewableField = (col) => {
        return ['video_path', 'certificate_path', 'cv_path'].includes(col);
    };

    const hasValue = (value) => {
        return value && value.toString().trim() !== '';
    };

    // Helper function to get data from hidden columns
    const getHiddenColumnData = (columnName) => {
        return item[columnName];
    };

    // Helper function to check if column exists (visible or hidden)
    const hasColumn = (columnName) => {
        return allColumns ? allColumns.includes(columnName) : columns.includes(columnName);
    };

    // Example usage: Access enrolled students from hidden column
    const getEnrolledStudents = () => {
        if (hasColumn('enrolled_students')) {
            return getHiddenColumnData('enrolled_students');
        }
        return null;
    };

    return (
        <>
            <tr className={isSelected ? 'selected' : ''}>
                {allowBulkDelete && (
                    <td className="select-column">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onRowSelect(item[keyField], e.target.checked)}
                            className="row-checkbox"
                        />
                    </td>
                )}

                {additionalColumns.map(col => (
                    <td key={`${index}-${col.key}`}>
                        {/* Pass full item data and helper functions to additional columns */}
                        {col.render(item, index, {
                            getHiddenColumnData,
                            hasColumn,
                            allColumns,
                            getEnrolledStudents // Example helper
                        })}
                    </td>
                ))}
                
                {/* Only render visible columns */}
                {columns.map(col => (
                    <td key={`${index}-${col}`}>
                        {renderCellContent(col)}
                    </td>
                ))}


                {allowDelete && (
                    <td>
                        <button
                            className="delete-btn"
                            onClick={() => onDelete(item[keyField])}
                            title="Delete record"
                        >
                            Delete
                        </button>
                    </td>
                )}
            </tr>

            <PreviewModal
                previewData={previewData}
                onClose={closePreview}
            />
        </>
    );
};
