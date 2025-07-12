import { useState } from 'react';
import styles from '../../styles/Inputs.module.css';

export default function Input({ 
    label, 
    type, 
    name, 
    id, 
    value, 
    defaultValue,
    onChange, 
    checked, 
    maxLength, 
    required = false, 
    data = [] 
}) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(prev => !prev);
    };
    
    const getPasswordToggleIcon = () => {
        return isPasswordVisible ? '/eye-closed.png' : '/eye-open.png';
    };
    
    const getInputType = () => {
        if (type === 'password') {
            return isPasswordVisible ? 'text' : 'password';
        }
        return type;
    };
    
    const getInputClassName = () => {
        let className = styles.input;
        if (type === 'textarea') {
            className += ` ${styles.textarea}`;
        } else if (type === 'select') {
            className += ` ${styles.select}`;
        }
        return className;
    };
    
    const getCommonProps = () => ({
        id,
        name,
        placeholder: label,
        ...(value !== undefined ? { value } : { defaultValue }),
        onChange,
        maxLength
    });
    
    const getCheckableProps = () => {
        const isCheckable = type === 'radio' || type === 'checkbox';
        return isCheckable 
            ? { checked, onChange } 
            : { defaultChecked: checked };
    };
    
    const renderTextarea = () => (
        <textarea
            className={getInputClassName()}
            {...getCommonProps()}
            {...getCheckableProps()}
        />
    );
    
    const renderSelect = () => (
        <select
            className={getInputClassName()}
            {...getCommonProps()}
        >
            {data.map((option) => (
                <option value={option.id} key={option.id}>
                    {option.name}
                </option>
            ))}
        </select>
    );
    
    const renderInput = () => (
        <input
            className={getInputClassName()}
            type={getInputType()}
            {...getCommonProps()}
            pattern={type === 'tel' ? '[0-9]{10}' : undefined}
            {...(type === 'number' ? { min: 0 } : {})}
            {...getCheckableProps()}
        />
    );
    
    const renderPasswordToggle = () => {
        if (type !== 'password') return null;
        
        return (
            <span 
                onClick={togglePasswordVisibility} 
                className={styles.toggleVisibleButton}
            >
                <img src={getPasswordToggleIcon()} alt="Toggle password visibility" />
            </span>
        );
    };
    
    const renderInputField = () => {
        switch (type) {
            case 'textarea':
                return renderTextarea();
            case 'select':
                return renderSelect();
            default:
                return renderInput();
        }
    };
    
    return (
        <div className={styles.inputContainer}>
            {renderInputField()}
            <label htmlFor={id} className={styles.inputLabel}>
                {label} {required && <span className={styles.required}>*</span>}
            </label>
            {renderPasswordToggle()}
        </div>
    );
}
