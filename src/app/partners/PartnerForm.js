// /app/partners/PartnerForm.js
'use client';
import React, { useState, useEffect } from 'react';
import { usePartners } from '../../hooks/usePartners';
import FileUpload from '../components/FileUpload';
import styles from '../../styles/Partners.module.css';

const PartnerForm = ({ partner, onSuccess, onCancel, onError }) => {
    const { createPartner, updatePartner } = usePartners();
    
    const [formData, setFormData] = useState({
        partner_name        : '',
        partner_description : '',
        partner_url         : '',
        partner_image_path  : ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isEditing = !!partner;

    useEffect(() => {
        if (partner) {
            setFormData({
                partner_name        : partner.partner_name || '',
                partner_description : partner.partner_description || '',
                partner_url         : partner.partner_url || '',
                partner_image_path  : partner.partner_image_path || ''
            });
        }
    }, [partner]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
            if (isEditing) {
                await updatePartner(partner.partner_id, formData);
                onSuccess('Partner updated successfully');
            } else {
                await createPartner(formData);
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
