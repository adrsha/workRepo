// TableRow.js - Enhanced with hidden column support
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { TeacherVideoPlayer } from '../../teacherFetch';
import FileViewer from '../../FileViewer';

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

const PreviewModal = ({ previewData, onClose }) => {
    if (!previewData) return null;

    const { fieldName, item } = previewData;
    
    let previewContent;
    if (fieldName === 'video_path') {
        const teacherId = item.user_id || item.teacher_id || item.id;
        previewContent = <TeacherVideoPlayer teacherId={teacherId} />;
    } else if (fieldName === 'certificate_path') {
        previewContent = <FileViewer filePath={item[fieldName]} />;
    } else {
        previewContent = <div>Preview not available for this file type</div>;
    }

    const modalElement = (
        <div className="modal-overlay">
            <div className="modal-content preview-modal">
                <div className="modal-header">
                    <h3>File Preview</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="close-btn"
                    >
                        ×
                    </button>
                </div>
                <div className="preview-content">
                    {previewContent}
                </div>
            </div>
        </div>
    );

    return createPortal(modalElement, document.body);
};

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

    // Enhanced renderCell that can access all columns including hidden ones
    const renderCellContent = (col) => {
        const value = item[col];

        // Handle custom rendering first - pass allColumns for full data access
        if (renderCell) {
            const customContent = renderCell(item, col, index, allColumns);

            // If it's a preview field with value, show preview button
            if ((col === 'video_path' || col === 'certificate_path') && value && value.toString().trim() !== '') {
                return <PreviewButton onClick={() => handlePreview(col)} />;
            }

            return customContent;
        }

        // Default handling for preview fields
        if ((col === 'video_path' || col === 'certificate_path') && value && value.toString().trim() !== '') {
            return <PreviewButton onClick={() => handlePreview(col)} />;
        }

        // Default cell content
        return value;
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

                {/* Only render visible columns */}
                {columns.map(col => (
                    <td key={`${index}-${col}`}>
                        {renderCellContent(col)}
                    </td>
                ))}

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

