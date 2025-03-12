"use client";

import { useState, useCallback } from "react";
import "./innerStyles/EditableField.css";

export function EditableDropdown({ initialValue, onSave, label, options }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [tempValue, setTempValue] = useState(initialValue);

  const handleSave = useCallback(async () => {
    try {
      await onSave(tempValue);
      setValue(tempValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      // Optionally, show an error message to the user
    }
  }, [tempValue, onSave]);

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  return (
    <div className="editable-field">
      <label htmlFor={label} className="editable-field__label">
        {label}
      </label>
      {isEditing ? (
        <div className="editable-field__edit-container">
          <select
            id={label}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="editable-field__input"
            autoFocus
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="editable-field__button-container">
            <button onClick={handleSave} className="editable-field__button editable-field__button--save">
              Save
            </button>
            <button onClick={handleCancel} className="editable-field__button editable-field__button--cancel">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div onClick={() => setIsEditing(true)} className="editable-field__display">
          {options.find((opt) => opt.value === value)?.label || "Select a teacher"}
        </div>
      )}
    </div>
  );
}
