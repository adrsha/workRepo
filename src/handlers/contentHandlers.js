import { contentService } from '../app/api/contentService';
import { validateTextContent } from '../utils/contentUtils';

export const createContentHandlers = (
    classId,
    session,
    contents,
    setContents,
    { showSuccess, showError },
    { resetForm },
    refetch
) => {
    const deleteAssociatedFiles = async (contentId) => {
        try {
            // Get the content details to find associated files
            const content = contents.find(item => item.content_id === contentId);
            if (!content || !content.file_path) {
                return; // No files to delete
            }

            // Delete file using the same endpoint as FileUpload component
            const response = await fetch('/api/upload', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filePath: content.file_path }),
            });

            if (!response.ok) {
                console.warn('Failed to delete file:', content.file_path);
            }
        } catch (error) {
            console.warn('Error deleting associated files:', error);
        }
    };

    const handleAddTextContent = async (contentForm) => {
        if (!validateTextContent(contentForm)) {
            showError('Content cannot be empty');
            return;
        }

        try {
            await contentService.addTextContent(
                classId,
                contentForm,
                session?.accessToken
            );

            // Refetch to ensure data consistency
            await refetch();
            resetForm();
            showSuccess('Content added successfully');
        } catch (err) {
            console.error('Error adding content:', err);
            showError(err.message || 'Network error. Please try again.');
        }

        console.log("AfterContent", contentForm);
    };

    const handleFileUpload = async (file, is_public) => {
        try {
            await contentService.uploadFile(
                classId,
                file,
                is_public,
                session?.accessToken
            );

            // Refetch to ensure data consistency
            await refetch();
            resetForm();
            showSuccess('File uploaded successfully');
        } catch (err) {
            console.error('Error uploading file:', err);
            showError(err.message || 'Network error. Please try again.');
        }
    };

    // New handleFileSave function that matches the expected interface
    const handleFileSave = async (file, is_public = false) => {
        if (!file) {
            showError('Please select a file to upload');
            return;
        }

        try {
            await contentService.uploadFile(
                classId,
                file,
                is_public,
                session?.accessToken
            );

            // Refetch to ensure data consistency
            await refetch();
            resetForm();
            showSuccess('File uploaded successfully');
        } catch (err) {
            console.error('Error uploading file:', err);
            showError(err.message || 'Network error. Please try again.');
        }
    };

    const handleDeleteContent = async (contentId) => {
        try {
            // First delete associated files
            await deleteAssociatedFiles(contentId);

            // Then delete the content
            await contentService.deleteContent(contentId, session?.accessToken);

            // Optimistic update for delete (safer since we're removing)
            setContents(contents.filter(content => content.content_id !== contentId));
            showSuccess('Content deleted successfully');
        } catch (err) {
            console.error('Error deleting content:', err);
            showError(err.message || 'Network error. Please try again.');

            // Refetch on error to restore state
            await refetch();
        }
    };

    const handleToggleVisibility = async (contentId) => {
        try {
            const result = await contentService.toggleContentVisibility(contentId, session?.accessToken);
            
            // Update local state optimistically
            setContents(contents.map(content => 
                content.content_id === contentId 
                    ? { ...content, is_public: result.isPublic }
                    : content
            ));
            
            showSuccess(result.message || 'Content visibility updated');
        } catch (err) {
            console.error('Error toggling visibility:', err);
            showError(err.message || 'Network error. Please try again.');

            // Refetch on error to restore state
            await refetch();
        }
    };

    return {
        handleAddTextContent,
        handleFileUpload,
        handleFileSave,
        handleDeleteContent,
        handleToggleVisibility
    };
};
