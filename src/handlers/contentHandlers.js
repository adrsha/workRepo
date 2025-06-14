import { contentService } from '../app/api/contentService';
import { validateTextContent } from '../utils/contentUtils';

export const createContentHandlers = (
    classId, 
    session, 
    contents, 
    setContents, 
    { showSuccess, showError },
    { resetForm },
    refetch // Add refetch from useClassContent
) => {
    const handleAddTextContent = async (contentForm) => {
        console.log("BeforeContent", contentForm)
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
        console.log("AfterContent", contentForm)
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

    return {
        handleAddTextContent,
        handleFileUpload,
        handleFileSave, // Add this to the returned object
        handleDeleteContent
    };
};
