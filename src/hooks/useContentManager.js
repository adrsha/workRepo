//src/hooks/useContentManager.js
import { useState, useCallback } from 'react';
import { toSingular } from '@/utils/entityUtils';

export const useContentManager = (entityType, entityId, session) => {
    // Input validation
    if (!entityType) {
        console.warn('useContentManager: entityType is required');
        return null;
    }

    // State management with defensive defaults
    const [entities, setEntities]           = useState([]);
    const [entityContent, setEntityContents] = useState([]);
    const [entityDetails, setEntityDetails] = useState([]);
    const [contentRequests, setContentRequests] = useState([]);
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState(null);
    
    const apiBase = `/api/${entityType}`;
    const singularType = toSingular(entityType);
    const singularIdField = `${singularType}_id`;
    
    // Helper function for API calls with consistent error handling
    const apiCall = async (url, options = {}) => {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.accessToken && { 
                        'Authorization': `Bearer ${session.accessToken}` 
                    }),
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                let errorMessage = 'Request failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData?.error || errorData?.message || errorMessage;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            // Handle empty responses
            const text = await response.text();
            return text ? JSON.parse(text) : null;
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('fetch')) {
                throw new Error('Network error: Please check your connection');
            }
            throw err;
        }
    };
    
    const fetchEntities = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const data = await apiCall(apiBase);
            setEntities(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
            setEntities([]);
        } finally {
            setLoading(false);
        }
    }, [apiBase, session?.accessToken]);

    const fetchEntityDetails = useCallback(async () => {
        if (!entityId) {
            setEntityContents([]);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            const data = await apiCall(`${apiBase}/${entityId}`);
            setEntityDetails(data);
        } catch (err) {
            setError(err.message);
            setEntityContents([]);
        } finally {
            setLoading(false);
        }
    }, [apiBase, entityId, entityType, session?.accessToken]);
    
    // Fetch entity details with content
    const fetchEntityContent = useCallback(async () => {
        if (!entityId) {
            setEntityContents([]);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            const data = await apiCall(`${apiBase}Content/${entityId}`);
            setEntityContents(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
            setEntityContents([]);
        } finally {
            setLoading(false);
        }
    }, [apiBase, entityId, entityType, session?.accessToken]);


    // Fetch content access requests for admins
    const fetchContentRequests = useCallback(async () => {
        if (!session?.user || session.user.level < 1) return;

        try {
            const data = await apiCall(`/api/contentRequests?entityType=${entityType}&entityId=${entityId}`);
            setContentRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch content requests:', err);
        }
    }, [entityType, entityId, session?.accessToken, session?.user]);
    
    const createEntity = useCallback(async (entityData) => {
        if (!entityData || typeof entityData !== 'object') {
            throw new Error('Valid entity data is required');
        }

        if (!session?.accessToken) {
            throw new Error('Authentication required');
        }

        const newEntity = await apiCall(apiBase, {
            method : 'POST',
            body   : JSON.stringify(entityData)
        });
        
        if (newEntity) {
            setEntities(prev => [newEntity, ...prev]);
        }
        
        return newEntity;
    }, [apiBase, session?.accessToken]);
    
    // Delete entity
    const deleteEntity = useCallback(async (id) => {
        if (!id) {
            throw new Error('Entity ID is required');
        }

        if (!session?.accessToken) {
            throw new Error('Authentication required');
        }
        
        await apiCall(`${apiBase}?${singularType}Id=${id}`, {
            method: 'DELETE'
        });
        
        setEntities(prev => prev.filter(entity => entity[singularIdField] !== id));
    }, [apiBase, singularType, singularIdField, session?.accessToken]);
    
    // Add content to entity with user permissions
    const addContent = useCallback(async (contentData) => {
        if (!contentData || typeof contentData !== 'object') {
            throw new Error('Valid content data is required');
        }

        if (!entityId) {
            throw new Error('Entity ID is required');
        }

        if (!session?.accessToken) {
            throw new Error('Authentication required');
        }

        const payload = {
            ...contentData,
            [`${singularType}Id`] : entityId,
            // Remove authorizedUsers from contentData, we'll handle permissions separately
            authorizedUsers: undefined
        };

        // Use the existing API structure
        const apiPath = `${apiBase}Content/save`;
        const newContent = await apiCall(apiPath, {
            method : 'POST',
            body   : JSON.stringify(payload)
        });

        // If content was created and we have authorized users, assign permissions
        if (newContent && contentData.authorizedUsers && contentData.authorizedUsers.length > 0) {
            await assignContentPermissions(newContent.content_id, contentData.authorizedUsers);
        }

        if (newContent) {
            setEntityContents(prev => {
                const existingIndex = prev.findIndex(item => item.content_id === newContent.content_id);
                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = newContent;
                    return updated;
                } else {
                    return [...prev, newContent];
                }
            });
        }
        
        return newContent;
    }, [apiBase, entityId, entityType, singularType, session?.accessToken]);

    // Assign permissions to specific users for content
    const assignContentPermissions = useCallback(async (contentId, userIds) => {
        if (!session?.user || session.user.level < 1) {
            throw new Error('Admin access required');
        }

        await apiCall('/api/contentPermissions/assign', {
            method: 'POST',
            body: JSON.stringify({
                contentId,
                userIds,
                entityType,
                entityId
            })
        });

        // Refresh content to get updated permissions
        await fetchEntityContent();
    }, [entityType, entityId, session, fetchEntityContent]);

    // Remove permissions for content
    const removeContentPermissions = useCallback(async (contentId, userIds) => {
        if (!session?.user || session.user.level < 1) {
            throw new Error('Admin access required');
        }

        await apiCall('/api/contentPermissions/remove', {
            method: 'POST',
            body: JSON.stringify({
                contentId,
                userIds
            })
        });

        // Refresh content to get updated permissions
        await fetchEntityContent();
    }, [session, fetchEntityContent]);

    // Request access to content (for regular users)
    const requestContentAccess = useCallback(async (contentId = null, requestType = 'entity', message = '') => {
        if (!session?.user) {
            throw new Error('Authentication required');
        }
        console.log({
            body: JSON.stringify({
                contentId,
                entityType,
                entityId,
                requestType,
                message
            })
        }
        )
        await apiCall('/api/contentRequests/create', {
            method: 'POST',
            body: JSON.stringify({
                contentId,
                entityType,
                entityId,
                requestType,
                message
            })
        });
    }, [entityType, entityId, session]);

    // Process content access request (for admins)
    const processContentRequest = useCallback(async (requestId, action, adminNotes = '') => {
        if (!session?.user || session.user.level < 1) {
            throw new Error('Admin access required');
        }

        await apiCall('/api/contentRequests/process', {
            method: 'POST',
            body: JSON.stringify({
                requestId,
                action, // 'approve' or 'reject'
                adminNotes
            })
        });

        // Refresh requests and content
        await fetchContentRequests();
        if (action === 'approve') {
            await fetchEntityContent();
        }
    }, [session, fetchContentRequests, fetchEntityContent]);
    
    // Delete content from entity
    const deleteContent = useCallback(async (contentId) => {
        if (!contentId) {
            throw new Error('Content ID is required');
        }

        if (!entityId) {
            throw new Error('Entity ID is required');
        }

        if (!session?.accessToken) {
            throw new Error('Authentication required');
        }
        
        // Use the existing API structure
        const apiPath = `${apiBase}Content/${entityId}`;
        await apiCall(apiPath, {
            method : 'DELETE',
            body   : JSON.stringify({ contentId })
        });
        
        setEntityContents(prev => prev.filter(item => item?.content_id !== contentId));
    }, [apiBase, entityId, entityType, session?.accessToken]);
    
    // Reset functions for cleanup
    const resetEntities = useCallback(() => {
        setEntities([]);
        setError(null);
    }, []);

    const resetEntityDetails = useCallback(() => {
        setEntityContents([]);
        setError(null);
    }, []);
    
    return {
        // Data
        entities,
        entityContent,
        entityDetails,
        contentRequests,
        loading,
        error,
        
        // Actions
        fetchEntities,
        fetchEntityContent,
        fetchEntityDetails,
        fetchContentRequests,
        createEntity,
        deleteEntity,
        addContent,
        deleteContent,
        assignContentPermissions,
        removeContentPermissions,
        requestContentAccess,
        processContentRequest,
        
        // Utilities
        resetEntities,
        resetEntityDetails,
        refetch: entityId ? fetchEntityContent : fetchEntities
    };
};
