import styles from "../../styles/ClassContent.module.css";
import Input from "./Input";
import FileUpload from './FileUpload';
// ============== EDITOR COMPONENTS ==============
// components/editor/ContentTypeSelector.js
export const ContentTypeSelector = ({ selectedType, onSelectType }) => (
    <div className={styles.contentTypeSelector}>
        <button
            className={`${styles.typeButton} ${selectedType === 'text' ? styles.active : ''}`}
            onClick={() => onSelectType('text')}
        >
            Text
        </button>
        <button
            className={`${styles.typeButton} ${selectedType === 'file' ? styles.active : ''}`}
            onClick={() => onSelectType('file')}
        >
            File
        </button>
    </div>
);

// components/editor/VisibilityToggle.js
export const VisibilityToggle = ({ isPublic, onToggle }) => (
    <div className={styles.visibilityToggle}>
        <Input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => onToggle(e.target.checked)}
            className={styles.toggleInput}
            id="publicToggle"
            name="publicToggle"
            label="Make this content public"
        />
        <p className={styles.visibilityHelp}>
            {isPublic
                ? "This content will be visible to everyone"
                : "This content will only be visible to class members"
            }
        </p>
    </div>
);

// components/editor/TextEditor.js
export const TextEditor = ({ content, onChange, onSave }) => (
    <div className={styles.textEditor}>
        <textarea
            className={styles.contentTextarea}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter text content here..."
            rows={10}
        />
        <div className={styles.editorFooter}>
            {console.log("hi,", content)}
            {typeof (content) == "string" ?
                <button className={styles.saveButton} onClick={onSave}>
                    Save Text Content
                </button>
                : null
            }
        </div>
    </div>
);

// components/editor/FileUploadSection.js

export const FileUploadSection = ({ onFileUpload }) => (
    <div className={styles.fileUploadSection}>
        <FileUpload onFileUpload={onFileUpload} />
        <p className={styles.uploadHelp}>
            Select a file to upload. It will be saved immediately upon selection.
        </p>
    </div>
);

// components/editor/ContentEditor.js
// import { ContentTypeSelector } from './ContentTypeSelector';
// import { VisibilityToggle } from './VisibilityToggle';
// import { TextEditor } from './TextEditor';
// import { FileUploadSection } from './FileUploadSection';

export const ContentEditor = ({
    contentForm,
    onUpdateForm,
    onSaveText,
    onFileUpload,
    onCancel
}) => (
    <div className={styles.contentEditor}>
        <div className={styles.editorHeader}>
            <h4>Add Content</h4>
            <button className={styles.cancelButton} onClick={onCancel}>
                Cancel
            </button>
        </div>

        <ContentTypeSelector
            selectedType={contentForm.contentType}
            onSelectType={(type) => onUpdateForm('contentType', type)}
        />

        <VisibilityToggle
            isPublic={contentForm.isPublic}
            onToggle={(isPublic) => onUpdateForm('isPublic', isPublic)}
        />

        {contentForm.contentType === 'text' ? (
            <TextEditor
                content={contentForm.contentData}
                onChange={(data) => onUpdateForm('contentData', data)}
                onSave={onSaveText}
            />
        ) : (
            <FileUploadSection
                onFileUpload={(file) => onFileUpload(file, contentForm.isPublic)}
            />
        )}
    </div>
);
