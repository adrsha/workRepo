import styles from '../../styles/ClassDetails.module.css';

export const Toast = ({ message, type = 'error', onClose }) => (
    <div className={`${styles.toast} ${type === 'success' ? styles.successToast : ''}`}>
        <div className={styles.toastContent}>
            <span className={styles.toastMessage}>{message}</span>
            <button className={styles.toastClose} onClick={onClose}>✕</button>
        </div>
    </div>
);
