import { contentService } from '../../../../Codes/workRepo/src/app/api/contentService';
import { validateTextContent } from '../../../../Codes/workRepo/src/utils/contentUtils';

export const createContentHandlers = (
    classId, 
    session, 
    contents, 
    setContents, 
    { showSuccess, showError },
    { resetForm }
) => {
    const handleAddTextContent = async (contentForm) => {
        if (!validateTextContent(contentForm)) {
            showError('Content cannot be empty');
            return;
        }

        try {
            const data = await contentService.addTextContent(
                classId,
                contentForm,
                session?.accessToken
            );

            setContents([...contents, data]);
            resetForm();
            showSuccess('Content added successfully');
        } catch (err) {
            console.error('Error adding content:', err);
            showError(err.message || 'Network error. Please try again.');
        }
    };

    const handleFileUpload = async (file, isPublic) => {
        try {
            const data = await contentService.uploadFile(
                classId,
                file,
                isPublic,
                session?.accessToken
            );

            setContents([...contents, data]);
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
            setContents(contents.filter(content => content.content_id !== contentId));
            showSuccess('Content deleted successfully');
        } catch (err) {
            console.error('Error deleting content:', err);
            showError(err.message || 'Network error. Please try again.');
        }
    };

    return {
        handleAddTextContent,
        handleFileUpload,
        handleDeleteContent
    };
};
