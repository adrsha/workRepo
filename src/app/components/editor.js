import { useState, useEffect } from 'react';
import { UserSelector } from './UserSelector'; // Import the new enhanced component
import FileUpload from './FileUpload';
import Input from './Input';
import styles from "../../styles/ClassContent.module.css";
import { MarkdownContent } from '../../utils/markdown';

const UploadSuccess = ({ file, onSave, isUploading }) => (
    <div className={styles.uploadSuccess}>
        <p>✓ File uploaded: {file.originalName || file.name}</p>
        <button
            className={styles.saveButton}
            onClick={onSave}
            disabled={isUploading}
        >
            {isUploading ? 'Saving...' : 'Save File Content'}
        </button>
    </div>
);

export const FileUploadSection = ({ parentId, parentType, onFileSave, isPublic, price = 0, authorizedUsers = null }) => {
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleSave = async () => {
        if (!uploadedFile) {
            console.log('No uploaded file found');
            return;
        }

        setIsUploading(true);
        try {
            await onFileSave(uploadedFile, isPublic, authorizedUsers, price);
            setUploadedFile(null);
        } catch (error) {
            console.error('Error saving file:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleUploadComplete = (uploadResult) => {
        console.log('Upload completed:', uploadResult);
        setUploadedFile(uploadResult);
    };

    return (
        <div className={styles.fileUploadSection}>
            <FileUpload
                parentId={parentId}
                parentType={parentType}
                onUploadComplete={handleUploadComplete}
                isSignUpForm={false}
            />

            {uploadedFile && (
                <UploadSuccess
                    file={uploadedFile}
                    onSave={handleSave}
                    isUploading={isUploading}
                />
            )}

            <p className={styles.uploadHelp}>
                Upload a file and click save to add it as content.
            </p>
        </div>
    );
};

// Toolbar configuration
const toolbarConfig = [
    { label: 'B', action: '**bold**', title: 'Bold' },
    { label: 'I', action: '*italic*', title: 'Italic' },
    { label: 'H1', action: '# ', title: 'Header 1' },
    { label: 'H2', action: '## ', title: 'Header 2' },
    { label: 'H3', action: '### ', title: 'Header 3' },
    { label: 'Code', action: '`code`', title: 'Inline Code' },
    { label: 'Link', action: '[text](url)', title: 'Link' },
    { label: 'List', action: '- ', title: 'List Item' },
    { label: 'Quote', action: '> ', title: 'Blockquote' },
];

const MarkdownToolbar = ({ onInsert }) => (
    <div className={styles.markdownToolbar}>
        {toolbarConfig.map(({ label, action, title }) => (
            <button
                key={label}
                type="button"
                className={styles.toolButton}
                onClick={() => onInsert(action)}
                title={title}
            >
                {label}
            </button>
        ))}
    </div>
);

const MarkdownPreview = ({ content }) => (
    <div className={styles.markdownPreview}>
        <MarkdownContent
            content={content}
            className={styles.markdownContent}
        />
    </div>
);


const findLineStart = (content, position) => {
    return content.lastIndexOf('\n', position - 1) + 1;
};

const findLineEnd = (content, position) => {
    const lineEnd = content.indexOf('\n', position);
    return lineEnd === -1 ? content.length : lineEnd;
};

const insertInlineMarkdown = (content, syntax, start, end, selectedText) => {
    const insertions = {
        '[text](url)': selectedText
            ? { text: `[${selectedText}](url)`, cursor: start + selectedText.length + 3 }
            : { text: '[text](url)', cursor: start + 1 },
        '**bold**': selectedText
            ? { text: `**${selectedText}**`, cursor: end + 4 }
            : { text: '**bold**', cursor: start + 2 },
        '*italic*': selectedText
            ? { text: `*${selectedText}*`, cursor: end + 2 }
            : { text: '*italic*', cursor: start + 1 },
        '`code`': selectedText
            ? { text: `\`${selectedText}\``, cursor: end + 2 }
            : { text: '`code`', cursor: start + 1 }
    };

    if (insertions[syntax]) {
        const { text, cursor } = insertions[syntax];
        return {
            newContent: content.substring(0, start) + text + content.substring(end),
            newCursor: cursor
        };
    }

    return null;
};

const insertHeaderMarkdown = (content, syntax, start) => {
    const lineStart = findLineStart(content, start);
    const lineEnd = findLineEnd(content, start);
    const currentLine = content.substring(lineStart, lineEnd);
    const cleanLine = currentLine.replace(/^#+\s*/, '');

    return {
        newContent: content.substring(0, lineStart) + syntax + cleanLine + content.substring(lineEnd),
        newCursor: lineStart + syntax.length + cleanLine.length
    };
};

const insertLineStartMarkdown = (content, syntax, start) => {
    const lineStart = findLineStart(content, start);
    return {
        newContent: content.substring(0, lineStart) + syntax + content.substring(lineStart),
        newCursor: start + syntax.length
    };
};

const insertMarkdownSyntax = (content, syntax, start, end, selectedText) => {
    // Try inline insertion first
    const inlineResult = insertInlineMarkdown(content, syntax, start, end, selectedText);
    if (inlineResult) {
        return inlineResult;
    }

    // Handle header syntax
    if (syntax.startsWith('#')) {
        return insertHeaderMarkdown(content, syntax, start);
    }

    // Handle line-start syntax (lists, quotes)
    if (syntax === '- ' || syntax === '> ') {
        return insertLineStartMarkdown(content, syntax, start);
    }

    // Default: no change
    return { newContent: content, newCursor: start };
};

const EnhancedTextEditor = ({ content, onChange, onSave, saveButtonText = "Save Text Content" }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [splitView, setSplitView] = useState(true);

    const insertMarkdown = (syntax) => {
        const textarea = document.querySelector(`.${styles.contentTextarea}`);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        const { newContent, newCursor } = insertMarkdownSyntax(
            content, syntax, start, end, selectedText
        );

        onChange(newContent);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
        }, 0);
    };

    const setViewMode = (editMode, splitMode, previewMode) => {
        setSplitView(splitMode);
        setShowPreview(previewMode);
    };

    const ViewModeButtons = () => (
        <div className={styles.viewModeButtons}>
            <button
                type="button"
                className={`${styles.viewButton} ${!splitView && !showPreview ? styles.active : ''}`}
                onClick={() => setViewMode(true, false, false)}
            >
                Edit
            </button>
            <button
                type="button"
                className={`${styles.viewButton} ${splitView ? styles.active : ''}`}
                onClick={() => setViewMode(false, true, false)}
            >
                Split
            </button>
            <button
                type="button"
                className={`${styles.viewButton} ${showPreview && !splitView ? styles.active : ''}`}
                onClick={() => setViewMode(false, false, true)}
            >
                Preview
            </button>
        </div>
    );

    return (
        <div className={styles.textEditor}>
            <div className={styles.editorControls}>
                <MarkdownToolbar onInsert={insertMarkdown} />
                <div className={styles.controlsRight}>
                    <ViewModeButtons />
                </div>
            </div>

            <div className={`${styles.editorContainer} ${splitView ? styles.splitView : ''}`}>
                {(!showPreview || splitView) && (
                    <textarea
                        className={styles.contentTextarea}
                        value={content || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Enter markdown content here...

# Header 1
## Header 2
**Bold text** *Italic text*
`code` 
- List item
> Blockquote
[Link](url)"
                        rows={splitView ? 15 : 12}
                    />
                )}

                {(showPreview || splitView) && (
                    <MarkdownPreview content={content} />
                )}
            </div>

            <div className={styles.editorFooter}>
                <button
                    className={styles.saveButton}
                    onClick={onSave}
                    disabled={!content?.trim()}
                >
                    {saveButtonText}
                </button>
            </div>
        </div>
    );
};

const TypeButton = ({ type, isActive, onClick, children }) => (
    <button
        className={`${styles.typeButton} ${isActive ? styles.active : ''}`}
        onClick={() => onClick(type)}
    >
        {children}
    </button>
);

const ContentTypeSelector = ({ selectedType, onSelectType }) => (
    <div className={styles.contentTypeSelector}>
        <TypeButton type="text" isActive={selectedType === 'text'} onClick={onSelectType}>
            Text
        </TypeButton>
        <TypeButton type="file" isActive={selectedType === 'file'} onClick={onSelectType}>
            File
        </TypeButton>
    </div>
);

const VisibilityToggle = ({ is_public, onToggle }) => (
    <div className={styles.visibilityToggle}>
        <Input
            type="checkbox"
            checked={is_public || false}
            onChange={(e) => onToggle(e.target.checked)}
            className={styles.toggleInput}
            id="publicToggle"
            name="publicToggle"
            label="Make this content public"
        />
        <p className={styles.visibilityHelp}>
            {is_public ? "Visible to everyone" : "Visible to class members only"}
        </p>
    </div>
);

const ContentTitleSection = ({ contentForm, onUpdateForm, required = false }) => {
    return (
        <div className={styles.contentTitleSection}>
            <label className={styles.titleLabel}>
                <strong>Content Title{required ? ' *' : ''}:</strong>
                <input
                    type="text"
                    value={contentForm.content_title || ''}
                    onChange={(e) => onUpdateForm('content_title', e.target.value)}
                    placeholder="Enter a descriptive title for this content"
                    className={styles.titleField}
                    required={required}
                />
            </label>
            {required && !contentForm.content_title?.trim() && (
                <p className={styles.titleError}>Title is required</p>
            )}
        </div>
    );
};

const ContentAccessSection = ({ 
    contentForm, 
    onUpdateForm, 
    isAdmin, 
    showTitle = false, 
    titleRequired = false,
    entityType,
    entityId,
    showAccessControls = true,
    limitedAccessControls = false
}) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [viewSelectedUsers, setViewSelectedUsers] = useState(false);

    // Initialize selected users from contentForm
    useEffect(() => {
        if (contentForm.authorized_users && Array.isArray(contentForm.authorized_users)) {
            setSelectedUsers(contentForm.authorized_users);
        }
    }, [contentForm.authorized_users]);

    // Handle access type changes
    const handleAccessTypeChange = (e) => {
        const accessType = e.target.value;
        
        switch (accessType) {
            case 'public':
                onUpdateForm('is_public', true);
                onUpdateForm('authorized_users', null);
                onUpdateForm('price', 0);
                setSelectedUsers([]);
                break;
                
            case 'private':
                onUpdateForm('is_public', false);
                onUpdateForm('authorized_users', null);
                onUpdateForm('price', 0);
                setSelectedUsers([]);
                break;
                
            case 'paid':
                onUpdateForm('is_public', false);
                onUpdateForm('authorized_users', null);
                onUpdateForm('price', contentForm.price || 1.00);
                setSelectedUsers([]);
                break;
                
            case 'restricted':
                onUpdateForm('is_public', false);
                setViewSelectedUsers(true)
                onUpdateForm('authorized_users', selectedUsers);
                onUpdateForm('price', 0);
                break;
                
            default:
                break;
        }
    };

    // Determine current access type based on form state
    const getAccessType = () => {
        if (contentForm.is_public) return 'public';
        if (parseFloat(contentForm.price || 0) > 0) return 'paid';
        if (selectedUsers.length > 0 || (contentForm.authorized_users && contentForm.authorized_users.length > 0)) {
            return 'restricted';
        }
        return 'private';
    };

    // Handle price changes
    const handlePriceChange = (e) => {
        const price = parseFloat(e.target.value) || 0;
        onUpdateForm('price', price);
    };

    // Handle user selection changes
    const handleUserSelectionChange = (users) => {
        setSelectedUsers(users);
        onUpdateForm('authorized_users', users);
    };

    // Access type configurations for easier maintenance
    const accessTypeOptions = [
        { value: 'public',     label: 'Public (Free for everyone)' , important: true},
        { value: 'private',    label: 'Private (Only for students)', important: true},
        { value: 'paid',       label: 'Paid Content'               , important: false},
        { value: 'restricted', label: 'Restricted (Specific users)', important: false}
    ];

    const accessStatusMessages = {
        public     : { text: 'Everyone can access this content for free',                     className: 'statusPublic' },
        private    : { text: 'Only admins can access this content',                         className: 'statusPrivate' },
        paid       : { text: `Users need to pay Rs. ${(contentForm.price || 0).toFixed(2)} to access`, className: 'statusPaid' },
        restricted : { text: `${selectedUsers.length} specific user(s) can access this content for free`, className: 'statusRestricted' }
    };

    const currentAccessType = getAccessType();

    return (
        <div className={styles.contentAccessSection}>
            {/* Title Section */}
            {showTitle && (
                <ContentTitleSection 
                    contentForm={contentForm} 
                    onUpdateForm={onUpdateForm}
                    required={titleRequired}
                />
            )}

            {/* Access Controls */}
            {showAccessControls && isAdmin && (
                <>
                    <h4 className={styles.accessSectionTitle}>Content Access Settings</h4>
                    
                    {/* Access Type Selector */}
                    <div className={styles.accessTypeSelector}>
                        <label className={styles.accessLabel}>
                            <strong>Access Type:</strong>
                            <select 
                                value={currentAccessType} 
                                onChange={handleAccessTypeChange}
                                className={styles.accessSelect}
                            >
                                {accessTypeOptions.map(option => {
                                    if (limitedAccessControls){
                                        if (option.important) {
                                            return <option key={option.value} value={option.value}>{option.label}</option>
                                        }
                                    } else {
                                        return <option key={option.value} value={option.value}>{option.label}</option>
                                    }
                                })}
                            </select>
                        </label>
                    </div>

                    {/* Price Input for Paid Content */}
                    {currentAccessType === 'paid' && (
                        <div className={styles.priceInput}>
                            <label className={styles.priceLabel}>
                                <strong>Price (Rs.):</strong>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={contentForm.price || ''}
                                    onChange={handlePriceChange}
                                    placeholder="0.00"
                                    className={styles.priceField}
                                />
                            </label>
                            <p className={styles.priceHelp}>
                                Set a price for users to purchase access to this content
                            </p>
                        </div>
                    )}

                    {/* User Selector for Restricted Access */}
                    {viewSelectedUsers && entityType && entityId && (
                        <div className={styles.restrictedUsersInput}>
                            <label className={styles.usersLabel}>
                                <strong>Authorized Users:</strong>
                            </label>
                            <UserSelector
                                selectedUsers={selectedUsers}
                                onSelectionChange={handleUserSelectionChange}
                                entityType={entityType}
                                entityId={entityId}
                                showSelectedPreview={true}
                                maxHeight="250px"
                                placeholder="Search users..."
                                className={styles.userSelectorInEditor}
                            />
                            <p className={styles.usersHelp}>
                                Select users who can access this content for free
                            </p>
                        </div>
                    )}

                    {/* Access Status Display */}
                    <div className={styles.accessStatus}>
                        {accessStatusMessages[currentAccessType] && (
                            <span className={styles[accessStatusMessages[currentAccessType].className]}>
                                {currentAccessType === 'public' && '✅ '}
                                {currentAccessType === 'private' && '🔒 '}
                                {currentAccessType === 'paid' && '💰 '}
                                {currentAccessType === 'restricted' && '👥 '}
                                {accessStatusMessages[currentAccessType].text}
                            </span>
                        )}
                    </div>
                </>
            )}

            {/* Price Display for Non-Admin Users */}
            {!isAdmin && parseFloat(contentForm.price || 0) > 0 && (
                <div className={styles.priceDisplay}>
                    <p><strong>Price:</strong> Rs. {parseFloat(contentForm.price).toFixed(2)}</p>
                </div>
            )}
        </div>
    );
};

export default ContentAccessSection;

const EditorHeader = ({ onCancel, title = "Add Content" }) => (
    <div className={styles.editorHeader}>
        <h4>{title}</h4>
        <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
        </button>
    </div>
);


export const ContentEditor = ({
    parentId,
    parentType,
    isAdmin,
    contentForm,
    onUpdateForm,
    onSaveText,
    onFileSave,
    onCancel,
    title,
    saveButtonText,
    showTitle = false,
    titleRequired = false,
    showAccessControls = true, 
    limitedAccessControls = false 
}) => {
    const handleUpdateForm = (field, value) => {
        if (typeof onUpdateForm === 'function') {
            onUpdateForm(field, value);
        } else {
            // Fallback for object-style updates
            onUpdateForm({
                ...contentForm,
                [field]: value
            });
        }
    };

    const validateForm = () => {
        if (titleRequired && !contentForm.content_title?.trim()) {
            return false;
        }
        if (contentForm.content_type === 'text' && !contentForm.content_data?.trim()) {
            return false;
        }
        return true;
    };

    const handleSaveText = () => {
        if (!validateForm()) {
            return; // Form validation will show error messages
        }
        onSaveText();
    };

    const handleFileSaveWithPermissions = (file, isPublic, authorizedUsers, price) => {
        // Pass the selected users to the file save handler
        return onFileSave(file, isPublic, authorizedUsers, price);
    };

    return (
        <div className={styles.contentEditor}>
            <EditorHeader onCancel={onCancel} title={title} />

            <ContentTypeSelector
                selectedType={contentForm.content_type}
                onSelectType={(type) => handleUpdateForm('content_type', type)}
            />

            <ContentAccessSection
                contentForm={contentForm}
                onUpdateForm={handleUpdateForm}
                isAdmin={isAdmin}
                showTitle={showTitle}
                titleRequired={titleRequired}
                entityType={parentType}
                entityId={parentId}
                showAccessControls={showAccessControls}
                limitedAccessControls={limitedAccessControls}
            />

            {contentForm.content_type === 'text' ? (
                <EnhancedTextEditor
                    content={contentForm.content_data}
                    onChange={(data) => handleUpdateForm('content_data', data)}
                    onSave={handleSaveText}
                    saveButtonText={saveButtonText}
                    disabled={titleRequired && !contentForm.content_title?.trim()}
                />
            ) : (
                <FileUploadSection
                    parentId={parentId}
                    parentType={parentType}
                    onFileSave={handleFileSaveWithPermissions}
                    isPublic={contentForm.is_public}
                    price={contentForm.price || 0}
                    authorizedUsers={contentForm.authorized_users}
                />
            )}
        </div>
    );
};

export const TextOnlyEditor = ({
    content,
    onChange,
    onSave,
    onCancel,
    title = "Edit Content",
    saveButtonText = "Save Content",
    showVisibilityToggle = false,
    is_public,
    onToggleVisibility,
    isAdmin = false,
    contentForm,
    onUpdateForm,
    showTitle = false,
    titleRequired = false,
    entityType,
    entityId,
    showAccessControls = true
}) => {
    const validateAndSave = () => {
        if (titleRequired && contentForm && !contentForm.content_title?.trim()) {
            return; // Validation error will be shown
        }
        onSave();
    };

    return (
        <div className={styles.contentEditor}>
            <EditorHeader onCancel={onCancel} title={title} />

            {(showTitle && contentForm && onUpdateForm) && (
                <ContentAccessSection
                    contentForm={contentForm}
                    onUpdateForm={onUpdateForm}
                    isAdmin={isAdmin}
                    showTitle={showTitle}
                    titleRequired={titleRequired}
                    entityType={entityType}
                    entityId={entityId}
                    showAccessControls={showAccessControls}
                />
            )}

            {showVisibilityToggle && isAdmin && !showTitle && (
                <VisibilityToggle
                    is_public={is_public}
                    onToggle={onToggleVisibility}
                />
            )}

            <EnhancedTextEditor
                content={content}
                onChange={onChange}
                onSave={contentForm && onUpdateForm ? validateAndSave : onSave}
                saveButtonText={saveButtonText}
                disabled={titleRequired && contentForm && !contentForm.content_title?.trim()}
            />
        </div>
    );
};

