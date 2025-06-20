import styles from '../../styles/ClassContent.module.css';

export const LoadingState = () => (
    <div className={styles.loadingState}>Loading content...</div>
);

// components/ui/EmptyState.js
export const EmptyState = ({ isTeacher }) => (
    <div className={styles.emptyState}>
        {isTeacher
            ? "No content has been added to this class yet. Add content using the button below."
            : "No content has been added to this class yet."}
    </div>
);

// components/ui/Toast.js
export const Toast = ({ message, type, onClose }) => (
    <div className={`${styles.toast} ${type === 'success' ? 'success-toast' : 'error-toast'}`}>
        <div className={styles.toastContent}>
            <span className={styles.toastMessage}>{message}</span>
            <button className={styles.toastClose} onClick={onClose}>✕</button>
        </div>
    </div>
);

// components/ui/NotificationToasts.js
// import { Toast } from './Toast';

export const NotificationToasts = ({ error, success, onCloseError, onCloseSuccess }) => (
    <>
        {error && <Toast message={error} type="error" onClose={onCloseError} />}
        {success && <Toast message={success} type="success" onClose={onCloseSuccess} />}
    </>
);


