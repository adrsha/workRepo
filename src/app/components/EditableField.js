"use client"

import { useState, useCallback } from "react"
import "./innerStyles/EditableField.css"

export function EditableField({ initialValue, onSave, label, placeholder }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [tempValue, setTempValue] = useState(initialValue)

  const handleSave = useCallback(async () => {
    try {
      await onSave(tempValue)
      setValue(tempValue)
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to save:", error)
    }
  }, [tempValue, onSave])

  const handleCancel = () => {
    setTempValue(value)
    setIsEditing(false)
  }

  return (
    <div className="editable-field">
      <label htmlFor={label} className="editable-field__label">
        {label}
      </label>
      {isEditing ? (
        <div className="editable-field__edit-container">
          <input
            type="text"
            id={label}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="editable-field__input"
            placeholder={placeholder}
            autoFocus
          />
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
          {(value != null) ? value.toString() : placeholder}
        </div>
      )}
    </div>
  )
}

