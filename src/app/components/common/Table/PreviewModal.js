// PreviewModal.js
import { useSession } from 'next-auth/react';
import { createPortal } from 'react-dom';
import { TeacherVideoPlayer } from '../../teacherFetch';
import FileViewer from '../../FileViewer';
import { updateFilePath } from '@/app/lib/adminActions';

export const PreviewModal = ({ previewData, onClose, onFileUpdate }) => {
    if (!previewData) return null;

    const { data: session } = useSession();
    const isAdmin = session?.user?.level === 2;
    const { fieldName, item } = previewData;

    const handleFilePathUpdate = async (newFilePath) => {
        try {
            // Determine which table and ID to update
            const table = getTableFromItem(item);
            const id = getIdFromItem(item);

            // Update the file path in the database
            await updateFilePath(table, id, fieldName, newFilePath);

            // Notify parent component about the update
            if (onFileUpdate) {
                onFileUpdate(fieldName, newFilePath, item);
            }

            console.log('File path updated successfully');
        } catch (error) {
            console.error('Failed to update file path:', error);
            throw error; // Re-throw so FileViewer can handle the error
        }
    };

    const getTableFromItem = (item) => {
        // Determine table based on item properties
        if (item.teacher_id || item.user_id) {
            return 'teachers_view'; // or appropriate table name
        }
        // Add other table logic as needed
        return 'teachers'; // default fallback
    };

    const getIdFromItem = (item) => {
        return item.user_id || item.teacher_id || item.id;
    };

    const getPreviewContent = () => {
        if (fieldName === 'video_path') {
            const teacherId = getIdFromItem(item);
            return <TeacherVideoPlayer teacherId={teacherId} />;
        }

        if (fieldName === 'certificate_path' || fieldName === 'cv_path') {
            return (
                <FileViewer
                    filePath={item[fieldName]}
                    allowFileChange={isAdmin}
                    onFilePathUpdate={handleFilePathUpdate}
                />
            );
        }

        return <div>Preview not available for this file type</div>;
    };

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
                    {getPreviewContent()}
                </div>
            </div>
        </div>
    );

    return createPortal(modalElement, document.body);
};
