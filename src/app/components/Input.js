import styles from '../../styles/Inputs.module.css';

export default function Input({ label, type, name, id, value, onChange, checked, maxLength, required = false }) {
    return (
        <div className={styles.inputContainer}>
            {type === 'textarea' ? (
                <textarea
                    className={styles.input +" "+ styles.textarea}
                    id={id}
                    name={name}
                    placeholder={label}
                    value={value}
                    onChange={onChange}
                    maxLength={maxLength}
                    {...(type === 'radio' || type === 'checkbox' ? { checked, onChange } : {})}
                    {...(type !== 'radio' && type !== 'checkbox' ? { defaultChecked: checked } : {})}
                />
            ) : (
                <input
                    className={styles.input}
                    type={type}
                    id={id}
                    name={name}
                    placeholder={label}
                    value={value}
                    onChange={onChange}
                    maxLength={maxLength}
                    pattern={type === 'tel' ? '[0-9]{10}' : null}
                    {...(type === 'radio' || type === 'checkbox' ? { checked, onChange } : {})}
                    {...(type !== 'radio' && type !== 'checkbox' ? { defaultChecked: checked } : {})}
                />
            )}
            <label htmlFor={id} className={styles.inputLabel}>
                {label} {required && <span className={styles.required}>*</span>}
            </label>
        </div>
    );
}
