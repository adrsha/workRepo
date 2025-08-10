"use client"

import { useState, useEffect, useCallback } from "react"
import { revFormatColName } from '../lib/utils';
import "./innerStyles/EditableField.css"

// DateTime component helpers
const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'Not set'

    try {
        const date = new Date(dateTimeStr)
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date)
    } catch (e) {
        console.error('Date formatting error:', e)
        return dateTimeStr
    }
}

const combineDateTime = (date, time) => {
    return date && time ? `${date}T${time}:00` : ''
}

const extractDateFromDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return ''
    try {
        const date = new Date(dateTimeStr)
        return date.toISOString().split('T')[0]
    } catch (e) {
        console.error('Date extraction error:', e)
        return ''
    }
}

const extractTimeFromDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return ''
    try {
        const date = new Date(dateTimeStr)
        return date.toTimeString().slice(0, 5)
    } catch (e) {
        console.error('Time extraction error:', e)
        return ''
    }
}

// DateTime component
export const EditableDateTime = ({
    initialDateTime,
    onSave,
    label,
    disabled = false,
    className = "",
    placeholder = "Not set"
}) => {
    const [date, setDate] = useState(extractDateFromDateTime(initialDateTime))
    const [time, setTime] = useState(extractTimeFromDateTime(initialDateTime))
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        setDate(extractDateFromDateTime(initialDateTime))
        setTime(extractTimeFromDateTime(initialDateTime))
    }, [initialDateTime])

    const handleSave = useCallback(async () => {
        const newDateTime = combineDateTime(date, time)
        if (newDateTime === initialDateTime || isUpdating) return
        
        setIsUpdating(true)
        try {
            await onSave(newDateTime)
        } catch (error) {
            console.error("Failed to save:", error)
            setDate(extractDateFromDateTime(initialDateTime))
            setTime(extractTimeFromDateTime(initialDateTime))
        } finally {
            setIsUpdating(false)
        }
    }, [date, time, initialDateTime, onSave, isUpdating])

    const handleDateChange = (e) => {
        setDate(e.target.value)
    }

    const handleTimeChange = (e) => {
        setTime(e.target.value)
    }

    return (
        <div className={`editable-field ${className} ${disabled ? 'disabled' : ''}`}>
            <div className="editable-field__date-time-inputs">
                <div className="editable-field__input-group">
                    <label htmlFor={`date-${label}`} className="editable-field__input-label">
                        Date:
                    </label>
                    <input
                        type="date"
                        id={`date-${label}`}
                        value={date}
                        onChange={handleDateChange}
                        onBlur={handleSave}
                        className="editable-field__input"
                        disabled={disabled || isUpdating}
                    />
                </div>

                <div className="editable-field__input-group">
                    <label htmlFor={`time-${label}`} className="editable-field__input-label">
                        Time:
                    </label>
                    <input
                        type="time"
                        id={`time-${label}`}
                        value={time}
                        onChange={handleTimeChange}
                        onBlur={handleSave}
                        className="editable-field__input"
                        disabled={disabled || isUpdating}
                    />
                </div>
            </div>

            {date && time && (
                <input 
                    type="hidden" 
                    name={revFormatColName(label)} 
                    value={combineDateTime(date, time)} 
                />
            )}
        </div>
    )
}

// Convenience components for start and end times
export const EditableStartTime = (props) => (
    <EditableDateTime
        {...props}
        label={props.label || "Start Time"}
        placeholder={props.placeholder || "No start time set"}
    />
)

export const EditableEndTime = (props) => (
    <EditableDateTime
        {...props}
        label={props.label || "End Time"}
        placeholder={props.placeholder || "No end time set"}
    />
)
