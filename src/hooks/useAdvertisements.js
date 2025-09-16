// hooks/useAdvertisements.js
import { useState, useEffect } from 'react';

export const useAdvertisements = () => {
    const [advertisements, setAdvertisements]   = useState([]);
    const [loading, setLoading]                 = useState(false);
    const [error, setError]                     = useState(null);

    const fetchAdvertisements = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/advertisements');
            
            if (!response.ok) {
                throw new Error('Failed to fetch advertisements');
            }
            
            const data = await response.json();
            setAdvertisements(data);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching advertisements:', err);
        } finally {
            setLoading(false);
        }
    };

    const createAdvertisement = async (advertisementData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/advertisements', {
                method  : 'POST',
                headers : {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(advertisementData),
            });
            
            if (!response.ok) {
                throw new Error('Failed to create advertisement');
            }
            
            const newAdvertisement = await response.json();
            setAdvertisements(prev => [newAdvertisement, ...prev]);
            return newAdvertisement;
        } catch (err) {
            setError(err.message);
            console.error('Error creating advertisement:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateAdvertisement = async (advertisementId, advertisementData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/advertisements/${advertisementId}`, {
                method  : 'PUT',
                headers : {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(advertisementData),
            });
            
            if (!response.ok) {
                throw new Error('Failed to update advertisement');
            }
            
            const updatedAdvertisement = await response.json();
            setAdvertisements(prev => 
                prev.map(advertisement => 
                    advertisement.id === advertisementId ? updatedAdvertisement : advertisement
                )
            );
            return updatedAdvertisement;
        } catch (err) {
            setError(err.message);
            console.error('Error updating advertisement:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteAdvertisement = async (advertisementId) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/advertisements/${advertisementId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete advertisement');
            }
            
            setAdvertisements(prev => 
                prev.filter(advertisement => advertisement.id !== advertisementId)
            );
        } catch (err) {
            setError(err.message);
            console.error('Error deleting advertisement:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdvertisements();
    }, []);

    return {
        advertisements,
        loading,
        error,
        fetchAdvertisements,
        createAdvertisement,
        updateAdvertisement,
        deleteAdvertisement
    };
};
