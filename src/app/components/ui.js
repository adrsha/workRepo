// components/ui/LoadingState.js
export const LoadingState = () => (
    <div className="loading-state">Loading content...</div>
);

// components/ui/EmptyState.js
export const EmptyState = ({ isTeacher }) => (
    <div className="empty-state">
        {isTeacher
            ? "No content has been added to this class yet. Add content using the button below."
            : "No content has been added to this class yet."}
    </div>
);

// components/ui/Toast.js
export const Toast = ({ message, type, onClose }) => (
    <div className={`toast ${type === 'success' ? 'success-toast' : 'error-toast'}`}>
        <div className="toast-content">
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={onClose}>✕</button>
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
