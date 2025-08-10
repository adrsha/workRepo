"use client"

import { useState, useEffect, useCallback } from "react"
import { revFormatColName } from '../lib/utils';
import "./innerStyles/EditableField.css"

// Dropdown component
export const EditableDropdown = ({
    initialValue,
    onSave,
    label,
    options,
    placeholder,
    disabled = false,
    className = ""
}) => {
    const [value, setValue] = useState(initialValue || '')
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        setValue(initialValue || '')
    }, [initialValue])

    const handleSave = useCallback(async (newValue) => {
        if (newValue === initialValue || isUpdating) return
        
        setIsUpdating(true)
        try {
            await onSave(newValue)
        } catch (error) {
            console.error("Failed to save:", error)
            setValue(initialValue || '') // Reset on error
        } finally {
            setIsUpdating(false)
        }
    }, [initialValue, onSave, isUpdating])

    const handleChange = (e) => {
        const newValue = e.target.value
        setValue(newValue)
        handleSave(newValue) // Save immediately on selection
    }

    return (
        <div className={`editable-field ${className} ${disabled ? 'disabled' : ''}`}>
            <select
                value={value}
                onChange={handleChange}
                className="editable-field__input"
                disabled={disabled || isUpdating}
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
            {value && <input type="hidden" name={revFormatColName(label)} value={value} />}
        </div>
    )
}
