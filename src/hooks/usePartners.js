// hooks/usePartners.js
import { useState, useEffect } from 'react';

export const usePartners = () => {
    const [partners, setPartners]           = useState([]);
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState(null);

    const fetchPartners = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/partners');
            
            if (!response.ok) {
                throw new Error('Failed to fetch partners');
            }
            
            const data = await response.json();
            setPartners(data);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching partners:', err);
        } finally {
            setLoading(false);
        }
    };

    const createPartner = async (partnerData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/partners', {
                method  : 'POST',
                headers : {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(partnerData),
            });
            
            if (!response.ok) {
                throw new Error('Failed to create partner');
            }
            
            const newPartner = await response.json();
            setPartners(prev => [newPartner, ...prev]);
            return newPartner;
        } catch (err) {
            setError(err.message);
            console.error('Error creating partner:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updatePartner = async (partnerId, partnerData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/partners/${partnerId}`, {
                method  : 'PUT',
                headers : {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(partnerData),
            });
            
            if (!response.ok) {
                throw new Error('Failed to update partner');
            }
            
            const updatedPartner = await response.json();
            setPartners(prev => 
                prev.map(partner => 
                    partner.partner_id === partnerId ? updatedPartner : partner
                )
            );
            return updatedPartner;
        } catch (err) {
            setError(err.message);
            console.error('Error updating partner:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deletePartner = async (partnerId) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/partners/${partnerId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete partner');
            }
            
            setPartners(prev => prev.filter(partner => partner.partner_id !== partnerId));
        } catch (err) {
            setError(err.message);
            console.error('Error deleting partner:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    return {
        partners,
        loading,
        error,
        fetchPartners,
        createPartner,
        updatePartner,
        deletePartner
    };
};
