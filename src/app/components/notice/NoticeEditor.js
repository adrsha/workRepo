import { useState } from 'react';
import styles from '../../../styles/NoticeEditor.module.css';

export const NoticeEditor = ({ noticeForm, onUpdateForm, onSaveNotice, onCancel }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSaveNotice();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.noticeEditor}>
            <p className={styles.infoText}>
                After saving the notice title, you can add detailed content by clicking on the notice in the list.
            </p>

            <div className={styles.formGroup}>
                <label className={styles.label}>
                    Notice Title *
                </label>
                <input
                    type="text"
                    value={noticeForm.notice_title}
                    onChange={(e) => onUpdateForm('notice_title', e.target.value)}
                    className={styles.input}
                    placeholder="Enter notice title"
                    required
                />
            </div>

            <div className={styles.actions}>
                <button
                    type="button"
                    onClick={onCancel}
                    className={styles.cancelButton}
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : 'Save Notice'}
                </button>
            </div>
        </form>
    )
};
