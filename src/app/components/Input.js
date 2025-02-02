import styles from '../../styles/Inputs.module.css';
export default function Input({ label, type, name, id, value, onChange }) {
    return (
        <div className={styles.inputContainer}>
            <input
                className={styles.input}
                type={type}
                id={id}
                name={name}
                placeholder={label}
                value={value}
                onChange={onChange}
            />
            <label htmlFor={id} className={styles.inputLabel}>
                {label}
            </label>
        </div>
    );
}
