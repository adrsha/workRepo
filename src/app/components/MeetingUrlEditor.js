import { useState } from 'react';
import styles from '../../styles/ClassDetails.module.css';
import { isValidUrl } from '../../utils/api';

export const MeetingUrlEditor = ({
    meetingUrl,
    onUpdate,
    onRegenerate,
    isUpdating,
    isRegenerating,
    canEdit,
    canGenerate
}) => {
    const [editMode, setEditMode] = useState(false);
    const [urlInput, setUrlInput] = useState(meetingUrl || '');
    const [urlError, setUrlError] = useState('');

    const handleSave = () => {
        if (!urlInput.trim()) {
            setUrlError('Meeting URL cannot be empty');
            return;
        }

        if (!isValidUrl(urlInput.trim())) {
            setUrlError('Please enter a valid URL');
            return;
        }

        setUrlError('');
        onUpdate(urlInput.trim());
        setEditMode(false);
    };

    const handleCancel = () => {
        setUrlInput(meetingUrl || '');
        setUrlError('');
        setEditMode(false);
    };

    if (!canEdit && !canGenerate) {
        return (
            <div className={styles.meetingUrlEditor}>
                <div className={styles.urlDisplay}>
                    <span className={styles.urlText}>
                        {meetingUrl || 'No meeting URL set'}
                    </span>
                    <div className={styles.disabledMessage}>
                        Meeting URL cannot be edited - class time has passed or not available today
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.meetingUrlEditor}>
            {editMode ? (
                <div className={styles.urlInputGroup}>
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Enter meeting URL"
                        className={`${styles.urlInput} ${urlError ? styles.error : ''}`}
                    />
                    {urlError && <span className={styles.errorText}>{urlError}</span>}
                    <div className={styles.urlActions}>
                        <button
                            onClick={handleSave}
                            disabled={isUpdating}
                            className={styles.saveButton}
                        >
                            {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={handleCancel} className={styles.cancelButton}>
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className={styles.urlDisplay}>
                    <span className={styles.urlText}>
                        {meetingUrl || 'No meeting URL set'}
                    </span>
                    <div className={styles.urlActions}>
                        {canEdit && (
                            <button
                                onClick={() => setEditMode(true)}
                                className={styles.editButton}
                            >
                                Edit
                            </button>
                        )}
                        {canGenerate && (
                            <button
                                onClick={onRegenerate}
                                disabled={isRegenerating}
                                className={styles.regenerateButton}
                            >
                                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
