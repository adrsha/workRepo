"use client"

import { useState, useEffect, useCallback } from "react"
import { revFormatColName } from '../lib/utils';
import "./innerStyles/EditableField.css"

export function EditableDate ({ initialValue, onSave, label, placeholder, disabled = false }) {
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
            console.error("Failed to save date:", error)
            setValue(initialValue || '') // Reset on error
        } finally {
            setIsUpdating(false)
        }
    }, [initialValue, onSave, isUpdating])

    const handleBlur = () => {
        handleSave(value)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur() // Trigger save on Enter
        } else if (e.key === 'Escape') {
            setValue(initialValue || '') // Reset on Escape
        }
    }

    return (
        <div className="editable-field">
            <input
                type="date"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="editable-field__input"
                placeholder={placeholder}
                disabled={disabled || isUpdating}
            />
            {value && <input type="hidden" name={revFormatColName(label)} value={value} />}
        </div>
    )
}
