import { useState } from 'react';
import { EditableField } from './EditableField';
import { EditableDropdown } from './EditableDropdown';

const CONTENT_TYPE_OPTIONS = [
    { value: 'lesson', label: 'Lesson' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'material', label: 'Material' }
];

const ContentRow = ({ content, onSave, onDelete }) => {
    const handleSave = (field, value) => {
        const processedValue = field === 'content_order' ? parseInt(value, 10) : value;
        onSave(content.content_id, field, processedValue);
    };

    const handleDelete = () => {
        onDelete(content.content_id);
    };

    return (
        <div className="content-row">
            <div className="content-col">
                <EditableField
                    initialValue={content.content_title || ''}
                    onSave={(value) => handleSave('content_title', value)}
                    placeholder="Enter title"
                    label="Title"
                />
            </div>
            <div className="content-col">
                <EditableField
                    initialValue={content.content_description || ''}
                    onSave={(value) => handleSave('content_description', value)}
                    placeholder="Enter description"
                    label="Description"
                />
            </div>
            <div className="content-col">
                <EditableDropdown
                    initialValue={content.content_type || 'lesson'}
                    onSave={(value) => handleSave('content_type', value)}
                    options={CONTENT_TYPE_OPTIONS}
                    placeholder="Select type"
                    label="Type"
                />
            </div>
            <div className="content-col">
                <EditableField
                    initialValue={content.content_order || 0}
                    onSave={(value) => handleSave('content_order', value)}
                    placeholder="Enter order"
                    label="Order"
                    type="number"
                />
            </div>
            <div className="content-col">
                <button
                    className="delete-content-btn"
                    onClick={handleDelete}
                    title="Delete content"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
};

const ContentsTable = ({ contentsData, onSave, onDelete }) => {
    if (contentsData.length === 0) {
        return <div className="no-contents">No contents available for this class</div>;
    }

    return (
        <div className="contents-table">
            <div className="contents-header">
                <div className="content-col">Title</div>
                <div className="content-col">Description</div>
                <div className="content-col">Type</div>
                <div className="content-col">Order</div>
                <div className="content-col">Actions</div>
            </div>
            
            {contentsData.map((content) => (
                <ContentRow
                    key={content.content_id}
                    content={content}
                    onSave={onSave}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};

const AddContentForm = ({ classId, contentsCount, onAdd }) => {
    const [newContent, setNewContent] = useState({
        content_title: '',
        content_description: '',
        content_type: 'lesson',
        content_order: contentsCount + 1
    });

    const handleInputChange = (field, value) => {
        const processedValue = field === 'content_order' ? parseInt(value, 10) || 0 : value;
        setNewContent(prev => ({ ...prev, [field]: processedValue }));
    };

    const handleAdd = async () => {
        try {
            await onAdd(classId, { ...newContent, class_id: classId });
            // Reset form
            setNewContent({
                content_title: '',
                content_description: '',
                content_type: 'lesson',
                content_order: contentsCount + 2
            });
        } catch (error) {
            console.error('Error adding content:', error);
        }
    };

    const isAddDisabled = !newContent.content_title.trim();

    return (
        <div className="add-content-section">
            <h4>Add New Content</h4>
            <div className="add-content-form">
                <input
                    type="text"
                    placeholder="Content Title"
                    value={newContent.content_title}
                    onChange={(e) => handleInputChange('content_title', e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Content Description"
                    value={newContent.content_description}
                    onChange={(e) => handleInputChange('content_description', e.target.value)}
                />
                <select
                    value={newContent.content_type}
                    onChange={(e) => handleInputChange('content_type', e.target.value)}
                >
                    {CONTENT_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <input
                    type="number"
                    placeholder="Order"
                    value={newContent.content_order}
                    onChange={(e) => handleInputChange('content_order', e.target.value)}
                />
                <button
                    className="add-content-btn"
                    onClick={handleAdd}
                    disabled={isAddDisabled}
                >
                    Add Content
                </button>
            </div>
        </div>
    );
};

export const ContentsPopup = ({ 
    classId, 
    contentsData, 
    onClose, 
    onSaveContent, 
    onAddContent, 
    onDeleteContent 
}) => {
    const handleDelete = async (contentId) => {
        if (window.confirm('Are you sure you want to delete this content?')) {
            try {
                await onDeleteContent(contentId);
            } catch (error) {
                console.error('Error deleting content:', error);
            }
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="contents-popup-overlay" onClick={handleOverlayClick}>
            <div className="contents-popup">
                <div className="contents-popup-header">
                    <h3>Class Contents</h3>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="contents-popup-body">
                    <ContentsTable
                        contentsData={contentsData}
                        onSave={onSaveContent}
                        onDelete={handleDelete}
                    />
                    
                    <AddContentForm
                        classId={classId}
                        contentsCount={contentsData.length}
                        onAdd={onAddContent}
                    />
                </div>
            </div>
        </div>
    );
};
