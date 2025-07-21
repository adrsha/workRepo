// components/MeetingUrlEditor.jsx
import { useState } from 'react';
import styles from '../../styles/ClassDetails.module.css';
import { isValidUrl } from '../../utils/api';
import {
    isClassAvailableToday,
    getTimeStatus,
    findClassOccurrences
} from '../../utils/classStatus';

/**
 * Get status message with timing information
 */
const getStatusMessage = (isTeacher, classDetails, repeatPattern, isValidDay, timeStatus) => {
    if (!isTeacher) {
        return 'Only teachers can edit meeting URLs';
    }

    if (!isValidDay) {
        if (repeatPattern) {
            const { next, previous } = findClassOccurrences(classDetails?.start_time, repeatPattern);

            if (next) {
                return `Next class: ${next.toLocaleDateString()}`;
            }
            if (previous) {
                return `Last class was: ${previous.toLocaleDateString()}`;
            }
            return 'Class is not scheduled for today';
        } else {
            // One-time class
            const classDate = new Date(classDetails?.start_time);
            const today = new Date();

            if (classDate.toDateString() === today.toDateString()) {
                return 'Class is scheduled for today';
            } else if (classDate > today) {
                return `Class scheduled for ${classDate.toLocaleDateString()}`;
            } else {
                return `Class was on ${classDate.toLocaleDateString()}`;
            }
        }
    }

    // Valid day - show time-based status
    const timeFormat = { hour: '2-digit', minute: '2-digit' };
    const startTime = new Date(classDetails?.start_time);
    const endTime = new Date(classDetails?.end_time);

    switch (timeStatus) {
        case 'before':
            return `Class starts at ${startTime.toLocaleTimeString([], timeFormat)}`;
        case 'during':
            return 'Class is currently active - URL can be managed';
        case 'after':
            return `Class ended at ${endTime.toLocaleTimeString([], timeFormat)}`;
        default:
            return 'Class timing could not be determined';
    }
};

/**
 * Handle URL validation
 */
const validateUrl = (url) => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
        return { isValid: false, error: 'Meeting URL cannot be empty' };
    }

    if (!isValidUrl(trimmedUrl)) {
        return { isValid: false, error: 'Please enter a valid URL' };
    }

    return { isValid: true, error: '' };
};


/**
 * Handle the complete regeneration process
 */
const handleRegenerationProcess = async (onRegenerate, onDatabaseUpdate) => {
    try {
        const newUrl = await onRegenerate();
        if (!newUrl) {
            throw new Error('Failed to generate new meeting URL');
        }

        if (onDatabaseUpdate) {
            await onDatabaseUpdate(newUrl);
        }

        return { success: true, newUrl };
    } catch (error) {
        console.error('Regeneration process failed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Custom confirmation modal component
 */
const ConfirmationModal = ({ isOpen, onConfirm, onCancel, generatedUrl }) => {
    if (!isOpen) return null;

    const hasGeneratedUrl = !!generatedUrl;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>
                    {hasGeneratedUrl ? 'Join Meeting as Teacher' : 'Generate New Meeting URL'}
                </h3>

                {hasGeneratedUrl ? (
                    <div className={styles.urlGeneratedContent}>
                        <p className={styles.modalMessage}>
                            Your new meeting URL has been generated. <br/>
                            <strong>Please join the meeting first to become the admin/host</strong>, then click <strong>"Use This URL"</strong> to save it.
                        </p>
                        <div className={styles.generatedUrlContainer}>
                            <input
                                type="text"
                                value={generatedUrl}
                                readOnly
                                className={styles.generatedUrlInput}
                            />
                            <button
                                onClick={() => window.open(generatedUrl, '_blank')}
                                className={styles.meetingButton}
                            >
                                Join Meeting
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className={styles.modalMessage}>
                        You are about to generate a new meeting URL. This will replace the current meeting link.
                    </p>
                )}

                <div className={styles.modalActions}>
                    {hasGeneratedUrl ? (
                        <>
                            <button onClick={onConfirm} className={styles.confirmButton}>
                                Use This URL
                            </button>
                            <button onClick={onCancel} className={styles.cancelButton}>
                                Cancel & Keep Old URL
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={onConfirm} className={styles.confirmButton}>
                                Generate New URL
                            </button>
                            <button onClick={onCancel} className={styles.cancelButton}>
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export const MeetingUrlEditor = ({
    meetingUrl,
    onUpdate,
    onRegenerate,
    onDatabaseUpdate,
    isUpdating,
    isRegenerating,
    classDetails,
    isTeacher = false,
    useCustomModal = false
}) => {
    const [editMode, setEditMode] = useState(false);
    const [urlInput, setUrlInput] = useState(meetingUrl || '');
    const [urlError, setUrlError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState(''); 
    const [regenerationError, setRegenerationError] = useState('');

    const repeatPattern = classDetails?.repeat_every_n_day || classDetails?.['repeat-n-days'];
    const isValidDay = isClassAvailableToday(classDetails?.start_time, classDetails?.end_time, repeatPattern);
    const timeStatus = isValidDay ? getTimeStatus(classDetails?.start_time, classDetails?.end_time) : null;
    const canEdit = isTeacher && isValidDay && timeStatus === 'during';

    /**
     * Handle manual URL save
     */
    const handleSave = () => {
        const validation = validateUrl(urlInput);

        if (!validation.isValid) {
            setUrlError(validation.error);
            return;
        }

        setUrlError('');
        onUpdate(urlInput.trim());
        setEditMode(false);
    };

    /**
     * Handle edit cancellation
     */
    const handleCancel = () => {
        setUrlInput(meetingUrl || '');
        setUrlError('');
        setEditMode(false);
    };

    /**
     * Handle regeneration button click
     */
    const handleRegenerateClick = () => {
        setRegenerationError('');

        if (useCustomModal) {
            setShowConfirmModal(true);
        } else {
            handleRegenerationConfirm();
        }
    };

    /**
     * Handle regeneration confirmation
     */
    const handleRegenerationConfirm = async () => {
        if (!generatedUrl) {
            // First step: generate the URL
            try {
                const newUrl = await onRegenerate();
                if (!newUrl) {
                    throw new Error('Failed to generate new meeting URL');
                }
                setGeneratedUrl(newUrl);
                // Keep modal open to show the URL
            } catch (error) {
                console.error('URL generation failed:', error);
                setRegenerationError(error.message || 'Failed to generate meeting URL');
                setShowConfirmModal(false);
            }
        } else {
            // Second step: user confirmed, update database
            try {
                if (onDatabaseUpdate) {
                    await onDatabaseUpdate(generatedUrl);
                }
                setShowConfirmModal(false);
                setGeneratedUrl('');
            } catch (error) {
                console.error('Database update failed:', error);
                setRegenerationError(error.message || 'Failed to update meeting URL');
                setShowConfirmModal(false);
                setGeneratedUrl('');
            }
        }
    };

    /**
     * Handle regeneration cancellation
     */
    const handleRegenerationCancel = () => {
        setShowConfirmModal(false);
        setGeneratedUrl(''); // Clear generated URL
    };

    const statusMessage = getStatusMessage(isTeacher, classDetails, repeatPattern, isValidDay, timeStatus);

    // Early return for non-editable state
    if (!canEdit) {
        return (
            <div className={styles.meetingUrlEditor}>
                <div className={styles.urlDisplay}>
                    <span className={styles.urlText}>
                        {meetingUrl || 'No meeting URL set'}
                    </span>
                    <div className={styles.statusMessage}>
                        {statusMessage}
                    </div>
                </div>
            </div>
        );
    }

    // Render editable interface
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
                        autoFocus
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
                        <button
                            onClick={handleCancel}
                            className={styles.cancelButton}
                            disabled={isUpdating}
                        >
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
                        <button
                            onClick={() => setEditMode(true)}
                            className={styles.editButton}
                        >
                            Edit
                        </button>
                        <button
                            onClick={handleRegenerateClick}
                            disabled={isRegenerating}
                            className={styles.regenerateButton}
                        >
                            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                        </button>
                    </div>
                    <div className={styles.statusMessage}>
                        {statusMessage}
                    </div>
                    {regenerationError && (
                        <div className={styles.errorMessage}>
                            {regenerationError}
                        </div>
                    )}
                </div>
            )}

            {/* Custom confirmation modal */}
            {useCustomModal && (
                <ConfirmationModal
                    isOpen={showConfirmModal}
                    onConfirm={handleRegenerationConfirm}
                    onCancel={handleRegenerationCancel}
                    generatedUrl={generatedUrl} 
                />
            )}
        </div>
    );
};
