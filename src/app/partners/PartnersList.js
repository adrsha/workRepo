// /app/partners/PartnersList.js
'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useNotifications } from '../../hooks/useNotifications';
import { usePartners } from '../../hooks/usePartners';
import { Toast } from '../components/Toast';
import Loading from '../components/Loading';
import styles from '../../styles/Partners.module.css';
import PartnerForm from './PartnerForm';

const PartnerCard = ({ partner, isAdmin, onEdit, onDelete }) => {
    const handleCardClick = (e) => {
        // Don't navigate if clicking edit/delete buttons
        if (e.target.closest('.admin-actions')) {
            e.preventDefault();
            return;
        }
        
        // Open partner URL in new tab
        window.open(partner.partner_url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div 
            className={styles.partnerCard} 
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
        >
            {partner.partner_image_path && (
                <div className={styles.partnerImageContainer}>
                    <img 
                        src={partner.partner_image_path} 
                        alt={partner.partner_name}
                        className={styles.partnerImage}
                        loading="lazy"
                    />
                </div>
            )}
            
            <div className={styles.partnerContent}>
                <h3 className={styles.partnerName}>{partner.partner_name}</h3>
                
                {partner.partner_description && (
                    <p className={styles.partnerDescription}>
                        {partner.partner_description}
                    </p>
                )}
                
                <div className={styles.partnerUrl}>
                    View Details ( पूरा विवरण हेर्नुहोस् )  → 
                </div>
            </div>

            {isAdmin && (
                <div className={`${styles.adminActions} admin-actions`}>
                    <button
                        className={styles.editButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(partner);
                        }}
                    >
                        Edit
                    </button>
                    <button
                        className={styles.deleteButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(partner.partner_id);
                        }}
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

const PartnersList = () => {
    const { data: session }                     = useSession();
    const { error, success, showSuccess, showError, clearNotifications } = useNotifications();
    const { partners, loading, deletePartner }  = usePartners();
    
    const [showForm, setShowForm]               = useState(false);
    const [editingPartner, setEditingPartner]   = useState(null);
    
    const isAdmin = session?.user?.level >= 1;

    useEffect(() => {
        if (success) {
            const timer = setTimeout(clearNotifications, 3000);
            return () => clearTimeout(timer);
        }
    }, [success, clearNotifications]);

    const handleAddPartner = () => {
        setEditingPartner(null);
        setShowForm(true);
    };

    const handleEditPartner = (partner) => {
        setEditingPartner(partner);
        setShowForm(true);
    };

    const handleDeletePartner = async (partnerId) => {
        if (!window.confirm('Are you sure you want to delete this partner?')) {
            return;
        }

        try {
            await deletePartner(partnerId);
            showSuccess('Partner deleted successfully');
        } catch (error) {
            showError('Failed to delete partner');
        }
    };

    const handleFormSuccess = (message) => {
        setShowForm(false);
        setEditingPartner(null);
        showSuccess(message);
    };

    const handleFormCancel = () => {
        setShowForm(false);
        setEditingPartner(null);
    };

    if (loading && partners.length === 0) {
        return <Loading />;
    }

    return (
        <div className={styles.partnersContainer}>
            <div className={styles.partnersHeader}>
                <h1 className={styles.partnersTitle}>Our Partners & Sponsors</h1>
                
                {isAdmin && (
                    <button
                        className={styles.addButton}
                        onClick={handleAddPartner}
                    >
                        Add Partner
                    </button>
                )}
            </div>

            {partners.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No partners found</p>
                    {isAdmin && (
                        <button
                            className={styles.addButton}
                            onClick={handleAddPartner}
                        >
                            Add First Partner
                        </button>
                    )}
                </div>
            ) : (
                <div className={styles.partnersGrid}>
                    {partners.map((partner) => (
                        <PartnerCard
                            key={partner.partner_id}
                            partner={partner}
                            isAdmin={isAdmin}
                            onEdit={handleEditPartner}
                            onDelete={handleDeletePartner}
                        />
                    ))}
                </div>
            )}

            {showForm && (
                <PartnerForm
                    partner={editingPartner}
                    onSuccess={handleFormSuccess}
                    onCancel={handleFormCancel}
                    onError={showError}
                />
            )}

            {(error || success) && (
                <Toast 
                    message={error || success} 
                    type={error ? 'error' : 'success'} 
                    onClose={clearNotifications}
                />
            )}
        </div>
    );
};

export default PartnersList;
