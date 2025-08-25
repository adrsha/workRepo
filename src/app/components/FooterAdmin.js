'use client';

import { useState, useEffect } from 'react';
import styles from '../../styles/FooterAdmin.module.css';

// API utility functions
const createApiRequest = () => async (url, options = {}) => {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

// Custom hooks for better state management
const useApiAction = (onSuccess) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const execute = async (action) => {
        setLoading(true);
        setError(null);
        try {
            await action();
            if (onSuccess) onSuccess();
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };
    
    return { execute, loading, error };
};

const useFooterData = () => {
    const [config, setConfig] = useState(null);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const apiRequest = createApiRequest();
    
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiRequest('/api/footer');
            setConfig(data.config);
            setSections(data.sections || []);
        } catch (err) {
            setError(err.message || 'Failed to load footer data');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);
    
    return { config, sections, loading, error, refetch: fetchData };
};

// Component for Config Management
const ConfigSection = ({ config, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const { execute, loading, error } = useApiAction(() => {
        setIsEditing(false);
        onRefresh();
    });
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const configData = {
            company_name: formData.get('company_name'),
            company_description: formData.get('company_description'),
            contact_phone: formData.get('contact_phone'),
            contact_email: formData.get('contact_email'),
            contact_address: formData.get('contact_address'),
            copyright_text: formData.get('copyright_text')
        };
        
        execute(async () => {
            const apiRequest = createApiRequest();
            await apiRequest('/api/footer_config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData),
            });
        });
    };
    
    const renderEditForm = () => (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
                <label htmlFor="company_name">Company Name *</label>
                <input
                    id="company_name"
                    name="company_name"
                    placeholder="Enter company name"
                    defaultValue={config?.company_name || ''}
                    required
                />
            </div>
            
            <div className={styles.formGroup}>
                <label htmlFor="company_description">Company Description</label>
                <textarea
                    id="company_description"
                    name="company_description"
                    placeholder="Brief description of your company"
                    defaultValue={config?.company_description || ''}
                    rows="3"
                />
            </div>
            
            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label htmlFor="contact_phone">Phone</label>
                    <input
                        id="contact_phone"
                        name="contact_phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        defaultValue={config?.contact_phone || ''}
                    />
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="contact_email">Email</label>
                    <input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        placeholder="contact@company.com"
                        defaultValue={config?.contact_email || ''}
                    />
                </div>
            </div>
            
            <div className={styles.formGroup}>
                <label htmlFor="contact_address">Address</label>
                <input
                    id="contact_address"
                    name="contact_address"
                    placeholder="123 Main St, City, State 12345"
                    defaultValue={config?.contact_address || ''}
                />
            </div>
            
            <div className={styles.formGroup}>
                <label htmlFor="copyright_text">Copyright Text</label>
                <input
                    id="copyright_text"
                    name="copyright_text"
                    placeholder="© 2024 Company Name. All rights reserved."
                    defaultValue={config?.copyright_text || ''}
                />
            </div>
            
            <div className={styles.buttonGroup}>
                <button type="submit" disabled={loading} className={styles.saveButton}>
                    {loading ? 'Saving Changes...' : 'Save Company Info'}
                </button>
                <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className={styles.cancelButton}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
    
    const renderDisplay = () => (
        <div className={styles.configDisplay}>
            <div className={styles.configGrid}>
                <div className={styles.configItem}>
                    <strong>Company:</strong> 
                    <span>{config?.company_name || 'Not set'}</span>
                </div>
                <div className={styles.configItem}>
                    <strong>Description:</strong> 
                    <span>{config?.company_description || 'Not set'}</span>
                </div>
                <div className={styles.configItem}>
                    <strong>Phone:</strong> 
                    <span>{config?.contact_phone || 'Not set'}</span>
                </div>
                <div className={styles.configItem}>
                    <strong>Email:</strong> 
                    <span>{config?.contact_email || 'Not set'}</span>
                </div>
                <div className={styles.configItem}>
                    <strong>Address:</strong> 
                    <span>{config?.contact_address || 'Not set'}</span>
                </div>
                <div className={styles.configItem}>
                    <strong>Copyright:</strong> 
                    <span>{config?.copyright_text || 'Not set'}</span>
                </div>
            </div>
            <button 
                onClick={() => setIsEditing(true)}
                className={styles.editButton}
            >
                Edit Company Information
            </button>
        </div>
    );
    
    return (
        <div className={styles.section}>
            <h3>🏢 Company Information</h3>
            {error && <div className={styles.error}>{error}</div>}
            {isEditing ? renderEditForm() : renderDisplay()}
        </div>
    );
};

// Component for adding new sections
const AddSectionForm = ({ onRefresh }) => {
    const { execute, loading, error } = useApiAction(onRefresh);
    
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const sectionData = {
            title: formData.get('section_title'),
            display_order: parseInt(formData.get('display_order')) || 0
        };
        
        execute(async () => {
            const apiRequest = createApiRequest();
            await apiRequest('/api/footer_sections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sectionData),
            });
        });
        
        e.target.reset();
    };
    
    return (
        <div className={styles.section}>
            <h3> Add New Section</h3>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="section_title">Section Title *</label>
                        <input
                            id="section_title"
                            name="section_title"
                            placeholder="e.g., Quick Links, Services, About Us"
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="display_order">Display Order</label>
                        <input
                            id="display_order"
                            name="display_order"
                            type="number"
                            placeholder="0"
                            min="0"
                            max="999"
                            defaultValue="0"
                        />
                    </div>
                </div>
                <button type="submit" disabled={loading} className={styles.addButton}>
                    {loading ? 'Adding Section...' : 'Add Section'}
                </button>
            </form>
        </div>
    );
};

// Component for managing links within a section
const LinkManager = ({ sectionId, links, onRefresh }) => {
    const [editingLink, setEditingLink] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const { execute, loading, error } = useApiAction(() => {
        setEditingLink(null);
        setShowAddForm(false);
        onRefresh();
    });
    
    const handleAddLink = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const linkData = {
            section_id: sectionId,
            title: formData.get('link_title'),
            url: formData.get('link_url')
        };
        
        execute(async () => {
            const apiRequest = createApiRequest();
            await apiRequest('/api/footer_links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(linkData),
            });
        });
    };
    
    const handleLinkEdit = (e, link) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const title = formData.get('link_title')?.trim();
        const url = formData.get('link_url')?.trim();
        
        if (!title || !url) {
            handleDeleteLink(link.id);
            return;
        }
        
        execute(async () => {
            const apiRequest = createApiRequest();
            await apiRequest(`/api/footer_links/${link.id}`, {
                method: 'DELETE',
            });
            
            await apiRequest('/api/footer_links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section_id: sectionId, title, url }),
            });
        });
    };
    
    const handleDeleteLink = (linkId) => {
        if (!window.confirm('Delete this link?')) return;
        
        execute(async () => {
            const apiRequest = createApiRequest();
            await apiRequest(`/api/footer_links/${linkId}`, {
                method: 'DELETE',
            });
        });
    };
    
    const renderAddForm = () => (
        <div className={styles.addLinkForm}>
            <h5> Add New Link</h5>
            <form onSubmit={handleAddLink} className={styles.linkForm}>
                <div className={styles.formRow + " " + styles.form}>
                    <div className={styles.formGroup}>
                        <input
                            name="link_title"
                            placeholder="Link title (e.g., Home, About Us)"
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <input
                            name="link_url"
                            placeholder="URL (e.g., /about, https://example.com)"
                            required
                        />
                    </div>
                </div>
                <div className={styles.buttonGroup}>
                    <button type="submit" disabled={loading} className={styles.addButton}>
                        {loading ? 'Adding...' : 'Add Link'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setShowAddForm(false)}
                        className={styles.cancelButton}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
    
    const renderLinkItem = (link) => (
        <div key={link.id} className={styles.linkItem}>
            {editingLink === link.id ? (
                <form onSubmit={(e) => handleLinkEdit(e, link)} className={styles.linkEditForm}>
                    <div className={styles.formRow + " " + styles.form}>
                        <input
                            name="link_title"
                            defaultValue={link.title}
                            placeholder="Leave empty to delete"
                        />
                        <input
                            name="link_url"
                            defaultValue={link.url}
                            placeholder="Leave empty to delete"
                        />
                    </div>
                    <div className={styles.buttonGroup}>
                        <button type="submit" disabled={loading} className={styles.saveButton}>
                            {loading ? 'Saving...' : '💾 Save'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setEditingLink(null)}
                            className={styles.cancelButton}
                        >
                            Cancel
                        </button>
                    </div>
                    <div className={styles.hint}>
                        💡 Leave title or URL empty to delete this link
                    </div>
                </form>
            ) : (
                <div className={styles.linkDisplay}>
                    <div className={styles.linkInfo}>
                        <strong>{link.title}</strong>
                        <span className={styles.linkUrl}>{link.url}</span>
                    </div>
                    <div className={styles.linkActions}>
                        <button
                            onClick={() => setEditingLink(link.id)}
                            className={styles.editButton}
                            disabled={loading}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleDeleteLink(link.id)}
                            className={styles.deleteButton}
                            disabled={loading}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
    
    return (
        <div className={styles.linksSection}>
            <div className={styles.linksHeader}>
                <h5>🔗 Links in this section</h5>
                {!showAddForm && (
                    <button 
                        onClick={() => setShowAddForm(true)}
                        className={styles.addLinkButton}
                    >
                        Add Link
                    </button>
                )}
            </div>
            
            {error && <div className={styles.error}>{error}</div>}
            
            {showAddForm && renderAddForm()}
            
            <div className={styles.linksList}>
                {links && links.length > 0 ? (
                    links.map(renderLinkItem)
                ) : (
                    <div className={styles.emptyLinks}>
                        <p>🔗 No links in this section yet</p>
                        <p>Add your first link to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Component for managing individual sections
const SectionManager = ({ sections, onRefresh }) => {
    const [editingSection, setEditingSection] = useState(null);
    const { execute, loading, error } = useApiAction(() => {
        setEditingSection(null);
        onRefresh();
    });
    
    const handleSectionEdit = (e, section) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const title = formData.get('section_title')?.trim();
        const display_order = parseInt(formData.get('display_order')) || 0;
        
        if (!title) {
            handleDeleteSection(section.id);
            return;
        }
        
        execute(async () => {
            const apiRequest = createApiRequest();
            const existingLinks = section.links || [];
            
            await apiRequest(`/api/footer_sections/${section.id}`, {
                method: 'DELETE',
            });
            
            const newSectionResponse = await apiRequest('/api/footer_sections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, display_order }),
            });
            
            const newSectionId = newSectionResponse.id;
            for (const link of existingLinks) {
                await apiRequest('/api/footer_links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        section_id: newSectionId,
                        title: link.title,
                        url: link.url
                    }),
                });
            }
        });
    };
    
    const handleDeleteSection = (sectionId) => {
        if (!window.confirm('⚠️ This will delete the section and ALL its links. Are you sure?')) {
            return;
        }
        
        execute(async () => {
            const apiRequest = createApiRequest();
            await apiRequest(`/api/footer_sections/${sectionId}`, {
                method: 'DELETE',
            });
        });
    };
    
    const renderSectionEdit = (section) => (
        <form onSubmit={(e) => handleSectionEdit(e, section)} className={styles.editForm}>
            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label>Section Title</label>
                    <input
                        name="section_title"
                        defaultValue={section.title}
                        placeholder="Leave empty to delete section"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>Display Order</label>
                    <input
                        name="display_order"
                        type="number"
                        defaultValue={section.display_order}
                        min="0"
                        max="999"
                    />
                </div>
            </div>
            <div className={styles.buttonGroup}>
                <button type="submit" disabled={loading} className={styles.saveButton}>
                    {loading ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button 
                    type="button" 
                    onClick={() => setEditingSection(null)}
                    className={styles.cancelButton}
                >
                    Cancel
                </button>
            </div>
            <div className={styles.hint}>
                💡 <strong>Tip:</strong> Leave the title empty and save to delete this section and all its links
            </div>
        </form>
    );
    
    const renderSectionDisplay = (section) => (
        <>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionInfo}>
                    <h4>{section.title}</h4>
                    <span className={styles.orderBadge}>Order: {section.display_order}</span>
                </div>
                <div className={styles.sectionActions}>
                    <button
                        onClick={() => setEditingSection(section.id)}
                        className={styles.editButton}
                        disabled={loading}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDeleteSection(section.id)}
                        className={styles.deleteButton}
                        disabled={loading}
                    >
                        Delete
                    </button>
                </div>
            </div>
            <LinkManager sectionId={section.id} links={section.links} onRefresh={onRefresh} />
        </>
    );
    
    return (
        <div className={styles.section}>
            <h3>🔗 Manage Sections & Links</h3>
            {error && <div className={styles.error}>{error}</div>}
            {sections.length > 0 ? (
                sections.map((section) => (
                    <div key={section.id} className={styles.sectionItem}>
                        {editingSection === section.id 
                            ? renderSectionEdit(section) 
                            : renderSectionDisplay(section)
                        }
                    </div>
                ))
            ) : (
                <div className={styles.emptyState}>
                    <p>No sections created yet</p>
                    <p>Create your first section above to get started!</p>
                </div>
            )}
        </div>
    );
};

// Main component
const FooterAdmin = () => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const { config, sections, loading, error, refetch } = useFooterData();
    
    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading footer data...</p>
            </div>
        );
    }
    
    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }
    
    return (
        <>
            <button
                className={styles.toggleButton}
                onClick={() => setIsEditorOpen(!isEditorOpen)}
                title={isEditorOpen ? 'Close Footer Editor' : 'Open Footer Editor'}
            >
                {isEditorOpen ? '✕ Close Editor' : '⚙️ Edit Footer (Admin)'}
            </button>
            
            {isEditorOpen && (
                <div className={styles.adminContainer}>
                    <div className={styles.adminHeader}>
                        <h2>🛠️ Footer Management</h2>
                        <p>Manage your website's footer content and links</p>
                    </div>
                    
                    <ConfigSection config={config} onRefresh={refetch} />
                    <AddSectionForm onRefresh={refetch} />
                    <SectionManager sections={sections} onRefresh={refetch} />
                </div>
            )}
        </>
    );
};

export default FooterAdmin;
