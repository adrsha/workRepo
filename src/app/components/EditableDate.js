"use client"

import { useState, useEffect, useCallback } from "react"
import { revFormatColName } from '../lib/utils';
import "./innerStyles/EditableField.css"

export function EditableDate ({ initialDate, onSave, label, placeholder, disabled = false }) {
    console.log(initialDate)
    const [value, setValue] = useState(initialDate || '')
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        setValue(initialDate || '')
    }, [initialDate])

    const handleSave = useCallback(async (newValue) => {
        if (newValue === initialDate || isUpdating) return
        
        setIsUpdating(true)
        try {
            await onSave(newValue)
        } catch (error) {
            console.error("Failed to save date:", error)
            setValue(initialDate || '') // Reset on error
        } finally {
            setIsUpdating(false)
        }
    }, [initialDate, onSave, isUpdating])

    const handleBlur = () => {
        handleSave(value)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur() // Trigger save on Enter
        } else if (e.key === 'Escape') {
            setValue(initialDate || '') // Reset on Escape
        }
    }
    console.log("date", value)
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
