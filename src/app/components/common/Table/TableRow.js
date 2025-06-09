import { useState } from 'react';
import { createPortal } from 'react-dom';
import { TeacherVideoPlayer } from '../../teacherFetch';
import SecureFileViewer from '../../SecureFileViewer';

// ============== UTILITY FUNCTIONS ==============
const isVideoField = (fieldName) =>
    fieldName === 'video_path' || fieldName.includes('video');

const isCertificateField = (fieldName) =>
    fieldName === 'certificate_path' || fieldName.includes('certificate');

const isPreviewableField = (fieldName) =>
    isVideoField(fieldName) || isCertificateField(fieldName);

const hasValue = (value) => value && value.toString().trim() !== '';

// ============== PREVIEW COMPONENTS ==============
const PreviewButton = ({ onClick, disabled = false }) => (
    <>
        <label className="editable-field__label">Preview</label>
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="preview-btn"
            title="Preview file"
        >
            👁️
        </button>
    </>
);

const PreviewContent = ({ type, item, fieldName }) => {
    if (type === 'video') {
        const teacherId = item.user_id || item.teacher_id || item.id;
        return <TeacherVideoPlayer teacherId={teacherId} />;
    }

    if (type === 'certificate') {
        const content = {
            content_id: item[fieldName],
            content_data: JSON.stringify({
                fileType: 'application/pdf'
            })
        };
        return <SecureFileViewer content={content} />;
    }

    return <div>Preview not available for this file type</div>;
};

const PreviewModal = ({ previewData, onClose }) => {
    if (!previewData) return null;

    const { type, item, fieldName } = previewData;

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
                    <PreviewContent
                        type={type}
                        item={item}
                        fieldName={fieldName}
                    />
                </div>
            </div>
        </div>
    );

    // Render modal outside table structure using portal
    return createPortal(modalElement, document.body);
};

// ============== CELL RENDERER ==============
const CellContent = ({ item, col, index, renderCell, onPreview }) => {
    const value = item[col];

    const handlePreview = () => {
        const previewType = isVideoField(col) ? 'video' : 'certificate';
        onPreview({
            type: previewType,
            item,
            fieldName: col
        });
    };

    // Render custom content if renderCell is provided
    if (renderCell) {
        const customContent = renderCell(item, col, index);

        // If it's a previewable field with value, show only preview button
        if (isPreviewableField(col) && hasValue(value)) {
            return <PreviewButton onClick={handlePreview} />;
        }

        return customContent;
    }

    // Default rendering for previewable fields - show only preview button
    if (isPreviewableField(col) && hasValue(value)) {
        return <PreviewButton onClick={handlePreview} />;
    }

    // Default cell content
    return value;
};

// ============== MAIN COMPONENT ==============
export const TableRow = ({
    item,
    index,
    columns,
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

    const handlePreview = (data) => setPreviewData(data);
    const closePreview = () => setPreviewData(null);

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

                {columns.map(col => (
                    <td key={`${index}-${col}`}>
                        <CellContent
                            item={item}
                            col={col}
                            index={index}
                            renderCell={renderCell}
                            onPreview={handlePreview}
                        />
                    </td>
                ))}

                {additionalColumns.map(col => (
                    <td key={`${index}-${col.key}`}>
                        {col.render(item, index)}
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
