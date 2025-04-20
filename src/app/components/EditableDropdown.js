"use client"

import { useState, useEffect } from "react"
import "./innerStyles/EditableField.css"

export const EditableDropdown = ({
  initialValue,
  onSave,
  label,
  options,
  placeholder,
  disabled = false,
  className = "",
  showSelectedValue = false // New prop to display current value 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(""); // Added for validation feedback

  // Synchronize with updated props
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    // Only save if value is not empty or null
    if (value) {
      onSave(value);
      setIsEditing(false);
      setError("");
    } else {
      setError("Please select a value");
    }
  };

  // Find the matching option to display the label
  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayText = selectedOption
    ? selectedOption.label
    : placeholder || 'Click to edit';

  const handleCancel = () => {
    setIsEditing(false);
    setValue(initialValue); // Reset to initial value on cancel
    setError("");
  }

  return (
    <div className={`editable-field ${className} ${disabled ? 'disabled' : ''}`}>
      <div className="editable-field__header">
        <label htmlFor={`dropdown-${label}`} className="editable-field__label">
          {label}
        </label>
        {showSelectedValue && value && !isEditing && (
          <span className="editable-field__current-value">
            Current: {selectedOption?.label || value}
          </span>
        )}
      </div>

      {isEditing ? (
        <div className="editable-field__controls">
          <select
            id={`dropdown-${label}`}
            value={value || ''}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            className={error ? "has-error" : ""}
          >
            <option value="" disabled>
              {placeholder || 'Select an option'}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {error && (
            <div className="editable-field__error">{error}</div>
          )}

          <div className="editable-field__buttons">
            <button
              className="editable-field__button editable-field__button--save"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="editable-field__button editable-field__button--cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className="editable-field__display"
          onClick={() => !disabled && setIsEditing(true)}
        >
          <span className="editable-field__text">{displayText}</span>
          {!disabled && (
            <span className="editable-field__icon">✏️</span>
          )}
        </div>
      )}
    </div>
  );
};
