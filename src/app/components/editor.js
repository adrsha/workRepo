import { useState } from 'react';
import FileUpload from './FileUpload';
import Input from "./Input";
import styles from "../../styles/ClassContent.module.css";

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

export const FileUploadSection = ({ classId, onFileSave, isPublic }) => {
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleSave = async () => {
        console.log('handleSave called, uploadedFile:', uploadedFile);

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

    // This handles the file upload completion from FileUpload component
    const handleUploadComplete = (uploadResult) => {
        console.log('Upload completed:', uploadResult);
        setUploadedFile(uploadResult);
    };

    return (
        <div className={styles.fileUploadSection}>
            <FileUpload
                classId={classId}
                onUploadComplete={handleUploadComplete}
                isSignUpForm={false}  // Add this to show upload button
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
// Markdown parsing utilities
const markdownRules = [
    [/^### (.*$)/gim, '<h3>$1</h3>'],
    [/^## (.*$)/gim, '<h2>$1</h2>'],
    [/^# (.*$)/gim, '<h1>$1</h1>'],
    [/\*\*\*(.*)\*\*\*/gim, '<strong><em>$1</em></strong>'],
    [/\*\*(.*)\*\*/gim, '<strong>$1</strong>'],
    [/\*(.*)\*/gim, '<em>$1</em>'],
    [/__(.*?)__/gim, '<strong>$1</strong>'],
    [/_(.*?)_/gim, '<em>$1</em>'],
    [/`([^`]+)`/gim, '<code>$1</code>'],
    [/```([^```]+)```/gim, '<pre><code>$1</code></pre>'],
    [/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>'],
    [/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />'],
    [/~~(.*)~~/gim, '<del>$1</del>'],
    [/^---$/gim, '<hr>'],
    [/^\* (.*)$/gim, '<li>$1</li>'],
    [/^- (.*)$/gim, '<li>$1</li>'],
    [/^\+ (.*)$/gim, '<li>$1</li>'],
    [/^\d+\. (.*)$/gim, '<li>$1</li>'],
    [/^> (.*)$/gim, '<blockquote>$1</blockquote>'],
    [/\n/gim, '<br>']
];

const parseMarkdown = (text) => {
    if (!text) return '';
    return markdownRules.reduce((result, [regex, replacement]) =>
        result.replace(regex, replacement), text
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
    <div
        className={styles.markdownPreview}
        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
);

// Text insertion logic
const TextInsertion = {
    insertAtSelection: (content, syntax, start, end, selectedText) => {
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

        return this.insertAtLineStart(content, syntax, start);
    },

    insertAtLineStart: (content, syntax, start) => {
        if (syntax.startsWith('#')) {
            const lineStart = content.lastIndexOf('\n', start - 1) + 1;
            const lineEnd = content.indexOf('\n', start);
            const actualEnd = lineEnd === -1 ? content.length : lineEnd;
            const currentLine = content.substring(lineStart, actualEnd);
            const cleanLine = currentLine.replace(/^#+\s*/, '');

            return {
                newContent: content.substring(0, lineStart) + syntax + cleanLine + content.substring(actualEnd),
                newCursor: lineStart + syntax.length + cleanLine.length
            };
        }

        if (syntax === '- ' || syntax === '> ') {
            const lineStart = content.lastIndexOf('\n', start - 1) + 1;
            return {
                newContent: content.substring(0, lineStart) + syntax + content.substring(lineStart),
                newCursor: start + syntax.length
            };
        }

        return { newContent: content, newCursor: start };
    }
};

const EnhancedTextEditor = ({ content, onChange, onSave }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [splitView, setSplitView] = useState(true);

    const insertMarkdown = (syntax) => {
        const textarea = document.querySelector(`.${styles.contentTextarea}`);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        const { newContent, newCursor } = TextInsertion.insertAtSelection(
            content, syntax, start, end, selectedText
        );

        onChange(newContent);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
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
                <button
                    className={styles.saveButton}
                    onClick={onSave}
                    disabled={!content?.trim()}
                >
                    Save Text Content
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

const EditorHeader = ({ onCancel }) => (
    <div className={styles.editorHeader}>
        <h4>Add Content</h4>
        <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
        </button>
    </div>
);

export const ContentEditor = ({
    classId,
    contentForm,
    onUpdateForm,
    onSaveText,
    onFileSave,
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

            {contentForm.content_type === 'text' ? (
                <EnhancedTextEditor
                    content={contentForm.content_data}
                    onChange={(data) => onUpdateForm('content_data', data)}
                    onSave={onSaveText}
                />
            ) : (
                    <FileUploadSection
                        classId={classId}
                        onFileSave={onFileSave}
                        isPublic={contentForm.is_public}
                    />
                )}
        </div>
    );

export const contentService = {
    async addTextContent(classId, contentForm, accessToken) {
        const payload = {
            contentType: 'text',
            contentData: { text: contentForm.content_data },
            classId,
            isPublic: contentForm.is_public
        };

        return this.makeRequest('/api/content/save', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });
    },

    async saveFileContent(classId, fileData, isPublic, accessToken) {
        // fileData should contain the upload result with file path
        const payload = {
            contentType: 'file',
            contentData: fileData, // This contains the file path from upload
            classId,
            isPublic
        };

        return this.makeRequest('/api/content/save', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });
    },

    async deleteContent(contentId, accessToken) {
        return this.makeRequest(`/api/classContent/${contentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    },

    async fetchClassContent(classId, accessToken) {
        return this.makeRequest(`/api/classContent/${classId}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    },

    async makeRequest(url, options) {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        return response.json();
    }
};
