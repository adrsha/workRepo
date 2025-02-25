import styles from '../../styles/Payer.module.css';
export default function Payer() {
    return (
        <div className={styles.modal}>
            <div className={styles.modalContent + ' slabs'}>
                <h3>Payer Modal</h3>
                <p>This is a modal window</p>
            </div>
        </div>
    );
}
