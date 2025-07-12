'use client';

import { useState, useEffect } from 'react';
import styles from '../../styles/FooterAdmin.module.css';

const FooterAdmin = () => {
    const [config, setConfig] = useState(null);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [adminLoading, setAdminLoading] = useState(false);
    const [adminError, setAdminError] = useState(null);

    const [editingConfig, setEditingConfig] = useState(false);
    const [newLinkData, setNewLinkData] = useState({ section_id: '', title: '', url: '' });
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const toggleEditor = () => {
        setIsEditorOpen(!isEditorOpen);
    };

    // Fetch footer data
    const fetchFooterData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/footer');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setConfig(data.config);
            setSections(data.sections || []);
        } catch (err) {
            setError(err.message || 'Failed to load footer data');
            console.error('Error fetching footer data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load data on component mount
    useEffect(() => {
        fetchFooterData();
    }, []);

    const handleConfigSubmit = async (e) => {
        e.preventDefault();
        setAdminLoading(true);
        setAdminError(null);

        const formData = new FormData(e.target);
        const configData = {
            company_name: formData.get('company_name'),
            company_description: formData.get('company_description'),
            contact_phone: formData.get('contact_phone'),
            contact_email: formData.get('contact_email'),
            contact_address: formData.get('contact_address'),
            copyright_text: formData.get('copyright_text')
        };

        try {
            const response = await fetch('/api/footer/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(configData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update config');
            }

            setEditingConfig(false);
            await fetchFooterData();
        } catch (error) {
            setAdminError(error.message || 'Failed to update config');
            console.error('Failed to update config:', error);
        } finally {
            setAdminLoading(false);
        }
    };

    const handleAddSection = async (e) => {
        e.preventDefault();
        setAdminLoading(true);
        setAdminError(null);

        const formData = new FormData(e.target);
        const sectionData = {
            title: formData.get('section_title'),
            display_order: parseInt(formData.get('display_order')) || 0
        };

        try {
            const response = await fetch('/api/footer/sections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sectionData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add section');
            }

            e.target.reset();
            await fetchFooterData();
        } catch (error) {
            setAdminError(error.message || 'Failed to add section');
            console.error('Failed to add section:', error);
        } finally {
            setAdminLoading(false);
        }
    };

    const handleAddLink = async (e) => {
        e.preventDefault();
        setAdminLoading(true);
        setAdminError(null);

        if (!newLinkData.section_id || !newLinkData.title || !newLinkData.url) {
            setAdminError('All fields are required');
            setAdminLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/footer/links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newLinkData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add link');
            }

            setNewLinkData({ section_id: '', title: '', url: '' });
            await fetchFooterData();
        } catch (error) {
            setAdminError(error.message || 'Failed to add link');
            console.error('Failed to add link:', error);
        } finally {
            setAdminLoading(false);
        }
    };

    const handleDeleteSection = async (sectionId) => {
        if (!window.confirm('Are you sure you want to delete this section?')) {
            return;
        }

        setAdminLoading(true);
        setAdminError(null);

        try {
            const response = await fetch(`/api/footer/sections/${sectionId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete section');
            }

            await fetchFooterData();
        } catch (error) {
            setAdminError(error.message || 'Failed to delete section');
            console.error('Failed to delete section:', error);
        } finally {
            setAdminLoading(false);
        }
    };

    const handleDeleteLink = async (linkId) => {
        if (!window.confirm('Are you sure you want to delete this link?')) {
            return;
        }

        setAdminLoading(true);
        setAdminError(null);

        try {
            const response = await fetch(`/api/footer/links/${linkId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete link');
            }

            await fetchFooterData();
        } catch (error) {
            setAdminError(error.message || 'Failed to delete link');
            console.error('Failed to delete link:', error);
        } finally {
            setAdminLoading(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (error) return <div className={styles.error}>Error: {error}</div>;

    return (
        <>
            {/* Toggle Button */}
            <button
                className={styles.toggleButton}
                onClick={toggleEditor}
                title={isEditorOpen ? 'Close Footer Editor' : 'Open Footer Editor'}
            >
                {isEditorOpen ? '×' : 'Edit Footer | Admin'}
            </button>

            {/* Editor Panel */}
            {isEditorOpen && (
                <div className={styles.adminContainer}>
                    <h2>Footer Management</h2>

                    {adminError && <div className={styles.error}>{adminError}</div>}

                    {/* Config Section */}
                    <div className={styles.section}>
                        <h3>Company Information</h3>
                        {editingConfig ? (
                            <form onSubmit={handleConfigSubmit} className={styles.form}>
                                <input
                                    name="company_name"
                                    placeholder="Company Name"
                                    defaultValue={config?.company_name || ''}
                                    required
                                />
                                <textarea
                                    name="company_description"
                                    placeholder="Company Description"
                                    defaultValue={config?.company_description || ''}
                                    rows="3"
                                />
                                <input
                                    name="contact_phone"
                                    placeholder="Contact Phone"
                                    defaultValue={config?.contact_phone || ''}
                                />
                                <input
                                    name="contact_email"
                                    type="email"
                                    placeholder="Contact Email"
                                    defaultValue={config?.contact_email || ''}
                                />
                                <input
                                    name="contact_address"
                                    placeholder="Contact Address"
                                    defaultValue={config?.contact_address || ''}
                                />
                                <input
                                    name="copyright_text"
                                    placeholder="Copyright Text"
                                    defaultValue={config?.copyright_text || ''}
                                />
                                <div className={styles.buttonGroup}>
                                    <button type="submit" disabled={adminLoading}>
                                        {adminLoading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button type="button" onClick={() => setEditingConfig(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className={styles.configDisplay}>
                                <p><strong>Company:</strong> {config?.company_name}</p>
                                <p><strong>Description:</strong> {config?.company_description}</p>
                                <p><strong>Phone:</strong> {config?.contact_phone}</p>
                                <p><strong>Email:</strong> {config?.contact_email}</p>
                                <p><strong>Address:</strong> {config?.contact_address}</p>
                                <p><strong>Copyright:</strong> {config?.copyright_text}</p>
                                <button onClick={() => setEditingConfig(true)}>Edit Config</button>
                            </div>
                        )}
                    </div>

                    {/* Add Section */}
                    <div className={styles.section}>
                        <h3>Add New Section</h3>
                        <form onSubmit={handleAddSection} className={styles.form}>
                            <input
                                name="section_title"
                                placeholder="Section Title"
                                required
                            />
                            <input
                                name="display_order"
                                type="number"
                                placeholder="Display Order"
                                min="0"
                                max="999"
                            />
                            <button type="submit" disabled={adminLoading}>
                                {adminLoading ? 'Adding...' : 'Add Section'}
                            </button>
                        </form>
                    </div>

                    {/* Sections Management */}
                    <div className={styles.section}>
                        <h3>Manage Sections</h3>
                        {sections.length > 0 ? (
                            sections.map((section) => (
                                <div key={section.id} className={styles.sectionItem}>
                                    <div className={styles.sectionHeader}>
                                        <h4>{section.title} (Order: {section.display_order})</h4>
                                        <button
                                            onClick={() => handleDeleteSection(section.id)}
                                            className={styles.deleteBtn}
                                            disabled={adminLoading}
                                        >
                                            Delete Section
                                        </button>
                                    </div>

                                    <div className={styles.links}>
                                        {section.links && section.links.length > 0 ? (
                                            section.links.map((link) => (
                                                <div key={link.id} className={styles.linkItem}>
                                                    <span>{link.title} - {link.url}</span>
                                                    <button
                                                        onClick={() => handleDeleteLink(link.id)}
                                                        className={styles.deleteBtn}
                                                        disabled={adminLoading}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className={styles.noLinks}>No links in this section</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p>No sections found</p>
                        )}
                    </div>

                    {/* Add Link */}
                    <div className={styles.section}>
                        <h3>Add New Link</h3>
                        <form onSubmit={handleAddLink} className={styles.form}>
                            <select
                                value={newLinkData.section_id}
                                onChange={(e) => setNewLinkData({ ...newLinkData, section_id: e.target.value })}
                                required
                            >
                                <option value="">Select Section</option>
                                {sections.map((section) => (
                                    <option key={section.id} value={section.id}>
                                        {section.title}
                                    </option>
                                ))}
                            </select>
                            <input
                                placeholder="Link Title"
                                value={newLinkData.title}
                                onChange={(e) => setNewLinkData({ ...newLinkData, title: e.target.value })}
                                required
                            />
                            <input
                                placeholder="Link URL"
                                value={newLinkData.url}
                                onChange={(e) => setNewLinkData({ ...newLinkData, url: e.target.value })}
                                required
                            />
                            <button type="submit" disabled={adminLoading}>
                                {adminLoading ? 'Adding...' : 'Add Link'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default FooterAdmin;
