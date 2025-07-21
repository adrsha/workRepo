import styles from '../../styles/ClassDetails.module.css';

export const Toast = ({ message, type = 'error', onClose }) => {
    return <div className={`${styles.toast} ${type === 'success' ? styles.successToast : ''} ${type === 'info' ? styles.infoToast : '' }`}>
        <div className={styles.toastContent}>
            <span className={styles.toastMessage}>{message}</span>
            <button className={styles.toastClose} onClick={onClose}>✕</button>
        </div>
    </div>
};
