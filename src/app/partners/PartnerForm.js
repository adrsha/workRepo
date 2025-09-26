// /app/partners/PartnerForm.js
'use client';
import React, { useState, useEffect } from 'react';
import { usePartners } from '../../hooks/usePartners';
import FileUpload from '../components/FileUpload';
import styles from '../../styles/Partners.module.css';

const PartnerForm = ({ partner, onSuccess, onCancel, onError }) => {
    const { createPartner, updatePartner, partners } = usePartners();
    
    const [formData, setFormData] = useState({
        partner_name        : '',
        partner_description : '',
        partner_url         : '',
        partner_image_path  : '',
        partner_category    : ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCustomCategory, setShowCustomCategory] = useState(false);
    
    const isEditing = !!partner;

    // Extract existing categories from all partners
    const existingCategories = [...new Set(
        partners
            .filter(p => p.partner_category && p.partner_category.trim())
            .map(p => p.partner_category.trim())
    )].sort();

    // Common category suggestions
    const suggestedCategories = [
        'Technology Partner',
        'Financial Sponsor',
        'Media Partner',
        'Community Partner',
        'Strategic Partner',
        'Official Sponsor',
        'Supporting Organization',
        'Service Provider'
    ];

    // Combine existing and suggested categories, remove duplicates
    const categoryOptions = [...new Set([...existingCategories, ...suggestedCategories])].sort();

    useEffect(() => {
        if (partner) {
            setFormData({
                partner_name        : partner.partner_name || '',
                partner_description : partner.partner_description || '',
                partner_url         : partner.partner_url || '',
                partner_image_path  : partner.partner_image_path || '',
                partner_category    : partner.partner_category || ''
            });
            
            // Check if current category is in options or if we need custom input
            if (partner.partner_category && !categoryOptions.includes(partner.partner_category)) {
                setShowCustomCategory(true);
            }
        }
    }, [partner, categoryOptions]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCategoryChange = (e) => {
        const value = e.target.value;
        
        if (value === 'custom') {
            setShowCustomCategory(true);
            setFormData(prev => ({ ...prev, partner_category: '' }));
        } else {
            setShowCustomCategory(false);
            setFormData(prev => ({ ...prev, partner_category: value }));
        }
    };

    const handleImageUpload = (uploadResult) => {
        setFormData(prev => ({
            ...prev,
            partner_image_path: uploadResult.filePath
        }));
    };

    const validateForm = () => {
        if (!formData.partner_name.trim()) {
            onError('Partner name is required');
            return false;
        }
        
        if (!formData.partner_url.trim()) {
            onError('Partner URL is required');
            return false;
        }

        if (!formData.partner_category.trim()) {
            onError('Partner category is required');
            return false;
        }

        // Basic URL validation
        try {
            new URL(formData.partner_url);
        } catch {
            onError('Please enter a valid URL');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        
        try {
            // Trim and clean the form data
            const cleanedData = {
                ...formData,
                partner_name        : formData.partner_name.trim(),
                partner_description : formData.partner_description.trim(),
                partner_url         : formData.partner_url.trim(),
                partner_category    : formData.partner_category.trim()
            };

            if (isEditing) {
                await updatePartner(partner.partner_id, cleanedData);
                onSuccess('Partner updated successfully');
            } else {
                await createPartner(cleanedData);
                onSuccess('Partner created successfully');
            }
        } catch (error) {
            onError(isEditing ? 'Failed to update partner' : 'Failed to create partner');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>{isEditing ? 'Edit Partner' : 'Add New Partner'}</h2>
                    <button 
                        className={styles.closeButton}
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.partnerForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="partner_name" className={styles.formLabel}>
                            Partner Name *
                        </label>
                        <input
                            type="text"
                            id="partner_name"
                            name="partner_name"
                            value={formData.partner_name}
                            onChange={handleInputChange}
                            className={styles.formInput}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="partner_category" className={styles.formLabel}>
                            Partner Category *
                        </label>
                        
                        {!showCustomCategory ? (
                            <select
                                id="partner_category"
                                name="partner_category"
                                value={formData.partner_category}
                                onChange={handleCategoryChange}
                                className={styles.formSelect}
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">Select a category</option>
                                {categoryOptions.map(category => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                                <option value="custom">+ Create new category</option>
                            </select>
                        ) : (
                            <div className={styles.customCategoryInput}>
                                <input
                                    type="text"
                                    id="partner_category"
                                    name="partner_category"
                                    value={formData.partner_category}
                                    onChange={handleInputChange}
                                    className={styles.formInput}
                                    placeholder="Enter custom category"
                                    required
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className={styles.backToSelectButton}
                                    onClick={() => {
                                        setShowCustomCategory(false);
                                        setFormData(prev => ({ ...prev, partner_category: '' }));
                                    }}
                                    disabled={isSubmitting}
                                >
                                    Back to select
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="partner_url" className={styles.formLabel}>
                            Partner URL *
                        </label>
                        <input
                            type="url"
                            id="partner_url"
                            name="partner_url"
                            value={formData.partner_url}
                            onChange={handleInputChange}
                            className={styles.formInput}
                            placeholder="https://example.com"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="partner_description" className={styles.formLabel}>
                            Description
                        </label>
                        <textarea
                            id="partner_description"
                            name="partner_description"
                            value={formData.partner_description}
                            onChange={handleInputChange}
                            className={styles.formTextarea}
                            rows="4"
                            disabled={isSubmitting}
                            placeholder="Brief description of the partnership"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            Partner Logo/Image
                        </label>
                        <FileUpload
                            parentId={`partner-${Date.now()}`}
                            parentType="partners"
                            accept="image/*"
                            allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']}
                            uploadLabel="Drop partner image here or click to upload"
                            uploadButtonText="Upload Image"
                            successMessage="Image uploaded successfully"
                            onUploadComplete={handleImageUpload}
                            resetAfterUpload={false}
                            validateFileType={true}
                        />
                        
                        {formData.partner_image_path && (
                            <div className={styles.currentImagePreview}>
                                <img 
                                    src={formData.partner_image_path} 
                                    alt="Partner preview" 
                                    className={styles.previewImage}
                                />
                            </div>
                        )}
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting 
                                ? (isEditing ? 'Updating...' : 'Creating...') 
                                : (isEditing ? 'Update Partner' : 'Create Partner')
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PartnerForm;
