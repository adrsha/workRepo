import styles from "../../styles/ClassContent.module.css";
import Input from "./Input";
import FileUpload from './FileUpload';
import { useState } from 'react';

// Markdown parser - handles most common markdown features
const parseMarkdown = (text) => {
    if (!text) return '';
    
    return text
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // Bold and Italic
        .replace(/\*\*\*(.*)\*\*\*/gim, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/__(.*?)__/gim, '<strong>$1</strong>')
        .replace(/_(.*?)_/gim, '<em>$1</em>')
        
        // Code
        .replace(/`([^`]+)`/gim, '<code>$1</code>')
        .replace(/```([^```]+)```/gim, '<pre><code>$1</code></pre>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
        
        // Strikethrough
        .replace(/~~(.*)~~/gim, '<del>$1</del>')
        
        // Horizontal Rule
        .replace(/^---$/gim, '<hr>')
        
        // Lists
        .replace(/^\* (.*)$/gim, '<li>$1</li>')
        .replace(/^- (.*)$/gim, '<li>$1</li>')
        .replace(/^\+ (.*)$/gim, '<li>$1</li>')
        .replace(/^\d+\. (.*)$/gim, '<li>$1</li>')
        
        // Blockquotes
        .replace(/^> (.*)$/gim, '<blockquote>$1</blockquote>')
        
        // Line breaks
        .replace(/\n/gim, '<br>');
};

// Toolbar for quick markdown insertion
const MarkdownToolbar = ({ onInsert }) => {
    const tools = [
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

    return (
        <div className={styles.markdownToolbar}>
            {tools.map(({ label, action, title }) => (
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
};

// Preview toggle button
const PreviewToggle = ({ showPreview, onToggle }) => (
    <button
        type="button"
        className={`${styles.previewToggle} ${showPreview ? styles.active : ''}`}
        onClick={onToggle}
    >
        {showPreview ? 'Edit' : 'Preview'}
    </button>
);

// Live preview component
const MarkdownPreview = ({ content }) => (
    <div 
        className={styles.markdownPreview}
        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
);

// Enhanced text editor with split view option
const EnhancedTextEditor = ({ content, onChange, onSave }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [splitView, setSplitView] = useState(true);

    const insertMarkdown = (syntax) => {
        const textarea = document.querySelector(`.${styles.contentTextarea}`);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        
        let newContent;
        let newCursorPos = start;
        
        if (syntax === '[text](url)') {
            // For links
            if (selectedText) {
                newContent = content.substring(0, start) + 
                           `[${selectedText}](url)` + 
                           content.substring(end);
                newCursorPos = start + selectedText.length + 3; // Position cursor at 'url'
            } else {
                newContent = content.substring(0, start) + '[text](url)' + content.substring(end);
                newCursorPos = start + 1; // Position cursor at 'text'
            }
        } else if (syntax === '**bold**') {
            // For bold
            if (selectedText) {
                newContent = content.substring(0, start) + 
                           `**${selectedText}**` + 
                           content.substring(end);
                newCursorPos = end + 4; // Position after the closing **
            } else {
                newContent = content.substring(0, start) + '**bold**' + content.substring(end);
                newCursorPos = start + 2; // Position cursor inside the **
            }
        } else if (syntax === '*italic*') {
            // For italic
            if (selectedText) {
                newContent = content.substring(0, start) + 
                           `*${selectedText}*` + 
                           content.substring(end);
                newCursorPos = end + 2; // Position after the closing *
            } else {
                newContent = content.substring(0, start) + '*italic*' + content.substring(end);
                newCursorPos = start + 1; // Position cursor inside the *
            }
        } else if (syntax === '`code`') {
            // For inline code
            if (selectedText) {
                newContent = content.substring(0, start) + 
                           `\`${selectedText}\`` + 
                           content.substring(end);
                newCursorPos = end + 2; // Position after the closing `
            } else {
                newContent = content.substring(0, start) + '`code`' + content.substring(end);
                newCursorPos = start + 1; // Position cursor inside the `
            }
        } else if (syntax.startsWith('#')) {
            // For headers
            const lineStart = content.lastIndexOf('\n', start - 1) + 1;
            const lineEnd = content.indexOf('\n', start);
            const actualEnd = lineEnd === -1 ? content.length : lineEnd;
            const currentLine = content.substring(lineStart, actualEnd);
            
            // Remove existing header syntax
            const cleanLine = currentLine.replace(/^#+\s*/, '');
            newContent = content.substring(0, lineStart) + 
                        syntax + cleanLine + 
                        content.substring(actualEnd);
            newCursorPos = lineStart + syntax.length + cleanLine.length;
        } else if (syntax === '- ' || syntax === '> ') {
            // For list items and blockquotes
            const lineStart = content.lastIndexOf('\n', start - 1) + 1;
            newContent = content.substring(0, lineStart) + 
                        syntax + 
                        content.substring(lineStart);
            newCursorPos = start + syntax.length;
        }
        
        onChange(newContent);
        
        // Restore cursor position after state update
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const ViewModeButtons = () => (
        <div className={styles.viewModeButtons}>
            <button
                type="button"
                className={`${styles.viewButton} ${!splitView && !showPreview ? styles.active : ''}`}
                onClick={() => { setSplitView(false); setShowPreview(false); }}
            >
                Edit
            </button>
            <button
                type="button"
                className={`${styles.viewButton} ${splitView ? styles.active : ''}`}
                onClick={() => { setSplitView(!splitView); setShowPreview(false); }}
            >
                Split
            </button>
            <button
                type="button"
                className={`${styles.viewButton} ${showPreview && !splitView ? styles.active : ''}`}
                onClick={() => { setShowPreview(!showPreview); setSplitView(false); }}
            >
                Preview
            </button>
        </div>
    );

    return (
        <div className={styles.textEditor}>
            <div className={styles.editorControls}>
                <MarkdownToolbar onInsert={insertMarkdown} />
                <ViewModeButtons />
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
                <SaveButton content={content} onSave={onSave} />
            </div>
        </div>
    );
};

// Type selector buttons
const TypeButton = ({ type, isActive, onClick, children }) => (
    <button
        className={`${styles.typeButton} ${isActive ? styles.active : ''}`}
        onClick={() => onClick(type)}
    >
        {children}
    </button>
);

export const ContentTypeSelector = ({ selectedType, onSelectType }) => (
    <div className={styles.contentTypeSelector}>
        <TypeButton type="text" isActive={selectedType === 'text'} onClick={onSelectType}>
            Text
        </TypeButton>
        <TypeButton type="file" isActive={selectedType === 'file'} onClick={onSelectType}>
            File
        </TypeButton>
    </div>
);

export const VisibilityToggle = ({ is_public, onToggle }) => (
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
            {is_public
                ? "Visible to everyone"
                : "Visible to class members only"
            }
        </p>
    </div>
);

const SaveButton = ({ content, onSave }) => 
    typeof content === "string" ? (
        <button className={styles.saveButton} onClick={onSave}>
            Save Content
        </button>
    ) : null;

export const FileUploadSection = ({ onFileUpload }) => (
    <div className={styles.fileUploadSection}>
        <FileUpload onFileUpload={onFileUpload} />
        <p className={styles.uploadHelp}>
            File will be saved immediately upon selection.
        </p>
    </div>
);

const EditorHeader = ({ onCancel }) => (
    <div className={styles.editorHeader}>
        <h4>Add Content</h4>
        <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
        </button>
    </div>
);

const ContentBody = ({ contentForm, onUpdateForm, onSaveText, onFileUpload }) => 
    contentForm.content_type === 'text' ? (
        <EnhancedTextEditor
            content={contentForm.content_data}
            onChange={(data) => onUpdateForm('content_data', data)}
            onSave={onSaveText}
        />
    ) : (
        <FileUploadSection
            onFileUpload={(file) => onFileUpload(file, contentForm.is_public)}
        />
    );

export const ContentEditor = ({
    contentForm,
    onUpdateForm,
    onSaveText,
    onFileUpload,
    onCancel
}) => (
    <div className={styles.contentEditor}>
        <EditorHeader onCancel={onCancel} />
        
        <ContentTypeSelector
            selectedType={contentForm.content_type}
            onSelectType={(type) => onUpdateForm('content_type', type)}
        />

        <VisibilityToggle
            is_public={contentForm.is_public}
            onToggle={(is_public) => onUpdateForm('is_public', is_public)}
        />

        <ContentBody
            contentForm={contentForm}
            onUpdateForm={onUpdateForm}
            onSaveText={onSaveText}
            onFileUpload={onFileUpload}
        />
    </div>
);
