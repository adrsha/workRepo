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

// Legacy hook for backward compatibility - renamed to avoid confusion
export const useNoticeData = (noticeId) => {
    return useNoticeContentData(noticeId);
};
