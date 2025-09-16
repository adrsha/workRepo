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
    const [entityDetails, setEntityDetails] = useState([]);
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
    
    // Fetch all entities (notices or quizzes)
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
    
    // Fetch entity details with content
    const fetchEntityDetails = useCallback(async () => {
        if (!entityId) {
            setEntityDetails([]);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            const data = await apiCall(`${apiBase}Content/${entityId}`);
            setEntityDetails(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
            setEntityDetails([]);
        } finally {
            setLoading(false);
        }
    }, [apiBase, entityId, session?.accessToken]);
    
    // Create new entity
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
    
    // Add content to entity
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
        console.log(contentData.contentData.filePath);
        const payload = {
            ...contentData,
            [`${singularType}Id`] : entityId
        };
 
        const newContent = await apiCall(`${apiBase}Content/save`, {
            method : 'POST',
            body   : JSON.stringify(payload)
        });
 
        if (newContent) {
            setEntityDetails(prev => [...prev, payload]);
        }
        
        return newContent;
    }, [apiBase, entityId, singularType, session?.accessToken]);
    
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
        
        await apiCall(`${apiBase}Content/${entityId}`, {
            method : 'DELETE',
            body   : JSON.stringify({ contentId })
        });
        
        setEntityDetails(prev => prev.filter(item => item?.content_id !== contentId));
    }, [apiBase, entityId, session?.accessToken]);
    
    // Reset functions for cleanup
    const resetEntities = useCallback(() => {
        setEntities([]);
        setError(null);
    }, []);

    const resetEntityDetails = useCallback(() => {
        setEntityDetails([]);
        setError(null);
    }, []);
    
    return {
        // Data
        entities,
        entityDetails,
        loading,
        error,
        
        // Actions
        fetchEntities,
        fetchEntityDetails,
        createEntity,
        deleteEntity,
        addContent,
        deleteContent,
        
        // Utilities
        resetEntities,
        resetEntityDetails,
        refetch: entityId ? fetchEntityDetails : fetchEntities
    };
};
