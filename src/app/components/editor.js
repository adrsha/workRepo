import { useState } from 'react';
import FileUpload from './FileUpload';
import Input from "./Input";
import styles from "../../styles/ClassContent.module.css";
import { parseMarkdown, MarkdownContent } from '../../utils/markdown';

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

export const FileUploadSection = ({ parentId, parentType, onFileSave, isPublic }) => {
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleSave = async () => {
        console.log('handleSave called, uploadedFile:', uploadedFile);
        console.log(isPublic);

        if (!uploadedFile) {
            console.log('No uploaded file found');
            return;
        }

        setIsUploading(true);
        try {
            console.log('Calling onFileSave with:', uploadedFile, isPublic);
            await onFileSave(uploadedFile, isPublic);
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

// Text insertion utility functions
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

const EditorHeader = ({ onCancel, title = "Add Content" }) => (
    <div className={styles.editorHeader}>
        <h4>{title}</h4>
        <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
        </button>
    </div>
);

// Full ContentEditor with type selection
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
    saveButtonText
}) => (
    <div className={styles.contentEditor}>
        <EditorHeader onCancel={onCancel} title={title} />

        <ContentTypeSelector
            selectedType={contentForm.content_type}
            onSelectType={(type) => onUpdateForm('content_type', type)}
        />

        {isAdmin && (
            <VisibilityToggle
                is_public={contentForm.is_public}
                onToggle={(is_public) => onUpdateForm('is_public', is_public)}
            />
        )}

        {contentForm.content_type === 'text' ? (
            <EnhancedTextEditor
                content={contentForm.content_data}
                onChange={(data) => onUpdateForm('content_data', data)}
                onSave={onSaveText}
                saveButtonText={saveButtonText}
            />
        ) : (
            <FileUploadSection
                parentId={parentId}
                parentType={parentType}
                onFileSave={onFileSave}
                isPublic={contentForm.is_public}
            />
        )}
    </div>
);

// Text-only editor (no file upload, no type selection)
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
    isAdmin = false
}) => (
    <div className={styles.contentEditor}>
        <EditorHeader onCancel={onCancel} title={title} />

        {showVisibilityToggle && isAdmin && (
            <VisibilityToggle
                is_public={is_public}
                onToggle={onToggleVisibility}
            />
        )}

        <EnhancedTextEditor
            content={content}
            onChange={onChange}
            onSave={onSave}
            saveButtonText={saveButtonText}
        />
    </div>
);
