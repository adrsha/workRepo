import { noticeService } from "../app/api/noticeService";

export const createNoticeHandlers = (
    session,
    setNotices,
    notifications,
    formControls,
    refetch
) => {
    const handleAddNotice = async (noticeForm) => {
        if (!noticeForm.notice_title.trim()) {
            notifications.setError('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch('/api/notices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    notice_title: noticeForm.notice_title,
                    notice_data_time: new Date().toISOString(),
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create notice');
            }

            const newNotice = await response.json();
            setNotices(prev => [newNotice, ...prev]);
            notifications.setSuccess('Notice created successfully');
            formControls.resetForm();

        } catch (error) {
            console.error('Error creating notice:', error);
            notifications.setError(error.message || 'Failed to create notice');
        }
    };

    const handleDeleteNotice = async (noticeId) => {
        if (!confirm('Are you sure you want to delete this notice?')) {
            return;
        }

        try {
            const response = await fetch(`/api/notices?noticeId=${noticeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.accessToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete notice');
            }

            setNotices(prev => prev.filter(notice => notice.notices_id !== noticeId));
            notifications.setSuccess('Notice deleted successfully');
        } catch (error) {
            console.error('Error deleting notice:', error);
            notifications.setError(error.message || 'Failed to delete notice');
        }
    };


    return {
        handleAddNotice,
        handleDeleteNotice,
    };
};

export const createNoticeContentHandlers = (
    session,
    noticeId,
    setNoticeDetails,
    notifications,
    formControls,
    refetch
) => {
    // Updated handleAddContent function
    const handleAddContent = async (contentForm) => {
        if (!contentForm.content_data?.trim()) {
            notifications.setError('Please fill in the content data');
            return;
        }

        try {
            const newContent = await noticeService.addTextContent(
                noticeId,
                contentForm,
                session?.accessToken,
                session?.user?.id
            );

            // Add the new content to the notice details
            setNoticeDetails(prev => [...prev, newContent]);

            notifications.setSuccess('Content added successfully');
            formControls.resetForm();

            // Optionally refetch data to ensure consistency
            if (refetch) {
                refetch();
            }

        } catch (error) {
            console.error('Error adding content:', error);
            notifications.setError(error.message || 'Failed to add content');
        }
    };

    const handleDeleteContent = async (contentId) => {
        if (!confirm('Are you sure you want to delete this content?')) {
            return;
        }

        try {
            const response = await fetch(`/api/noticeContent/${noticeId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    contentId: contentId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete content');
            }

            // Remove the content from the local state
            setNoticeDetails(prev => prev.filter(notice => notice.content_id !== contentId));

            notifications.setSuccess('Content deleted successfully');

            // Optionally refetch data to ensure consistency
            if (refetch) {
                refetch();
            }

        } catch (error) {
            console.error('Error deleting content:', error);
            notifications.setError(error.message || 'Failed to delete content');
        }
    };

    // Updated handleFileSave function
    const handleFileSave = async (file, is_public = false) => {
        if (!file) {
            notifications.setError('Please select a file to upload');
            return;
        }

        try {
            await noticeService.uploadFile(
                noticeId,
                file,
                is_public,
                session?.accessToken
            );

            if (refetch) {
                await refetch();
            }

            formControls.resetForm();
            notifications.setSuccess('File uploaded successfully');

        } catch (error) {
            console.error('Error uploading file:', error);
            notifications.setError(error.message || 'Failed to upload file');
        }
    };
    return {
        handleAddContent,
        handleDeleteContent,
        handleFileSave
    };
};
