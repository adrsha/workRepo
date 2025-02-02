import styles from '../../styles/Registration.module.css';
export default function registrationLayout({ children }) {
    return (
        <div>
            <div className={styles.registrationContainer}>
                {children}
            </div>
        </div>
    );
}
