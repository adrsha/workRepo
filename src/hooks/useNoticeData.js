import { useState, useEffect, useCallback } from 'react';
import { fetchData } from '@/app/lib/helpers';

// Hook to fetch all notices (this should use the regular notices API)
export const useNoticesData = (session) => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const fetchNotices = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchData('notices', session?.accessToken);
            setNotices(data || []);
        } catch (err) {
            console.error('Error fetching notices:', err);
            setError(err.message || 'Failed to load notices');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);
    
    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);
    
    return {
        notices,
        setNotices,
        loading,
        error,
        refetch: fetchNotices
    };
};

// Hook to fetch notice content by notice ID
export const useNoticeContentData = (noticeId) => {
    const [noticeDetails, setNoticeDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const fetchNoticeContent = useCallback(async () => {
        if (!noticeId) {
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/noticeContent/${noticeId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch notice content');
            }
            
            const content = await response.json();
            setNoticeDetails(content || []);
        } catch (err) {
            console.error('Error fetching notice content:', err);
            setError(err.message || 'Failed to load notice content');
        } finally {
            setLoading(false);
        }
    }, [noticeId]);
    
    useEffect(() => {
        fetchNoticeContent();
    }, [fetchNoticeContent]);
    
    return {
        noticeDetails,
        setNoticeDetails,
        loading,
        error,
        refetch: fetchNoticeContent
    };
};

// Hook to add content to a notice
export const useAddNoticeContent = () => {
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState(null);
    
    const addContent = async (noticeId, contentData, session) => {
        if (!session?.accessToken) {
            throw new Error('Authentication required');
        }
        
        try {
            setAdding(true);
            setError(null);
            
            const response = await fetch(`/api/noticeContent/${noticeId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`
                },
                body: JSON.stringify(contentData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add content');
            }
            
            const newContent = await response.json();
            return newContent;
        } catch (err) {
            console.error('Error adding content:', err);
            setError(err.message);
            throw err;
        } finally {
            setAdding(false);
        }
    };
    
    return {
        addContent,
        adding,
        error
    };
};

// Hook to update content
export const useUpdateNoticeContent = () => {
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);
    
    const updateContent = async (contentId, contentData, session) => {
        if (!session?.accessToken) {
            throw new Error('Authentication required');
        }
        
        try {
            setUpdating(true);
            setError(null);
            
            const response = await fetch(`/api/noticeContent/${contentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`
                },
                body: JSON.stringify(contentData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update content');
            }
            
            const updatedContent = await response.json();
            return updatedContent;
        } catch (err) {
            console.error('Error updating content:', err);
            setError(err.message);
            throw err;
        } finally {
            setUpdating(false);
        }
    };
    
    return {
        updateContent,
        updating,
        error
    };
};

// Hook to delete content
export const useDeleteNoticeContent = () => {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);
    
    const deleteContent = async (contentId, session) => {
        if (!session?.accessToken) {
            throw new Error('Authentication required');
        }
        
        try {
            setDeleting(true);
            setError(null);
            
            const response = await fetch(`/api/noticeContent/${contentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete content');
            }
            
            const result = await response.json();
            return result;
        } catch (err) {
            console.error('Error deleting content:', err);
            setError(err.message);
            throw err;
        } finally {
            setDeleting(false);
        }
    };
    
    return {
        deleteContent,
        deleting,
        error
    };
};

// Combined hook for managing notice content (following the pattern from your notice handlers)
export const useNoticeContentManager = (noticeId, session) => {
    const { noticeDetails, setNoticeDetails, loading, error, refetch } = useNoticeContentData(noticeId);
    const { addContent, adding } = useAddNoticeContent();
    const { updateContent, updating } = useUpdateNoticeContent();
    const { deleteContent, deleting } = useDeleteNoticeContent();
    
    const handleAddContent = async (contentData) => {
        const newContent = await addContent(noticeId, contentData, session);
        setNoticeDetails(prev => [...prev, newContent]);
        return newContent;
    };
    
    const handleUpdateContent = async (contentId, contentData) => {
        const updatedContent = await updateContent(contentId, contentData, session);
        setNoticeDetails(prev => prev.map(content => 
            content.content_id === contentId ? { ...content, ...updatedContent } : content
        ));
        return updatedContent;
    };
    
    const handleDeleteContent = async (contentId) => {
        await deleteContent(contentId, session);
        setNoticeDetails(prev => prev.filter(content => content.content_id !== contentId));
    };
    
    return {
        noticeDetails,
        loading,
        error,
        adding,
        updating,
        deleting,
        refetch,
        addContent: handleAddContent,
        updateContent: handleUpdateContent,
        deleteContent: handleDeleteContent
    };
};

// Legacy hook for backward compatibility - renamed to avoid confusion
export const useNoticeData = (noticeId) => {
    return useNoticeContentData(noticeId);
};
