import styles from "../../styles/ClassContent.module.css";
import Input from "./Input";
import FileUpload from './FileUpload';

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
            Save Text Content
        </button>
    ) : null;

export const TextEditor = ({ content, onChange, onSave }) => (
    <div className={styles.textEditor}>
        <textarea
            className={styles.contentTextarea}
            value={content || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter text content here..."
            rows={10}
        />
        <div className={styles.editorFooter}>
            <SaveButton content={content} onSave={onSave} />
        </div>
    </div>
);

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
        <TextEditor
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
