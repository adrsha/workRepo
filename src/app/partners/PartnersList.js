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
                
                {partner.partner_category && (
                    <span className={styles.partnerCategory}>
                        Category: {partner.partner_category}
                    </span>
                )}
                
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

const CategorySection = ({ category, partners, isAdmin, onEdit, onDelete }) => {
    return (
        <div className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>{category}</h2>
            <div className={styles.partnersGrid}>
                {partners.map((partner) => (
                    <PartnerCard
                        key={partner.partner_id}
                        partner={partner}
                        isAdmin={isAdmin}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
};

const PartnersList = () => {
    const { data: session }                     = useSession();
    const { error, success, showSuccess, showError, clearNotifications } = useNotifications();
    const { partners, loading, deletePartner }  = usePartners();
    
    const [showForm, setShowForm]               = useState(false);
    const [editingPartner, setEditingPartner]   = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode]               = useState('categorized'); // 'categorized' or 'list'
    
    const isAdmin = session?.user?.level >= 1;

    // Group partners by category
    const categorizedPartners = partners.reduce((acc, partner) => {
        const category = partner.partner_category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(partner);
        return acc;
    }, {});

    // Get all unique categories
    const allCategories = Object.keys(categorizedPartners).sort();
    
    // Get filtered partners based on selected category
    const filteredPartners = selectedCategory === 'all' 
        ? partners 
        : partners.filter(partner => 
            (partner.partner_category || 'Uncategorized') === selectedCategory
          );

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
                
                <div className={styles.headerControls}>
                    {/* View Mode Toggle */}
                    <div className={styles.viewModeToggle}>
                        <button
                            className={`${styles.toggleButton} ${viewMode === 'categorized' ? styles.active : ''}`}
                            onClick={() => setViewMode('categorized')}
                        >
                            By Category
                        </button>
                        <button
                            className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            List View
                        </button>
                    </div>

                    {/* Category Filter (only shown in list view) */}
                    {viewMode === 'list' && allCategories.length > 0 && (
                        <select
                            className={styles.categoryFilter}
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {allCategories.map(category => (
                                <option key={category} value={category}>
                                    {category} ({categorizedPartners[category].length})
                                </option>
                            ))}
                        </select>
                    )}

                    {isAdmin && (
                        <button
                            className={styles.addButton}
                            onClick={handleAddPartner}
                        >
                            Add Partner
                        </button>
                    )}
                </div>
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
                <>
                    {viewMode === 'categorized' ? (
                        // Categorized view - show partners grouped by category
                        <div className={styles.categorizedView}>
                            {allCategories.map(category => (
                                <CategorySection
                                    key={category}
                                    category={category}
                                    partners={categorizedPartners[category]}
                                    isAdmin={isAdmin}
                                    onEdit={handleEditPartner}
                                    onDelete={handleDeletePartner}
                                />
                            ))}
                        </div>
                    ) : (
                        // List view - show filtered partners in a grid
                        <div className={styles.listView}>
                            {selectedCategory !== 'all' && (
                                <h2 className={styles.filterTitle}>
                                    {selectedCategory} ({filteredPartners.length})
                                </h2>
                            )}
                            <div className={styles.partnersGrid}>
                                {filteredPartners.map((partner) => (
                                    <PartnerCard
                                        key={partner.partner_id}
                                        partner={partner}
                                        isAdmin={isAdmin}
                                        onEdit={handleEditPartner}
                                        onDelete={handleDeletePartner}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
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
