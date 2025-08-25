"use client"

import { useState, useEffect, useCallback } from "react"
import { revFormatColName } from '../lib/utils';
import "./innerStyles/EditableField.css"

const combineDateTime = (date, time) => {
    return date && time ? `${date}T${time}:00.000Z` : ''
}

// Fixed timezone-aware date extraction
const extractDateFromDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return ''
    try {
        // Create date object and get local date components
        const date = new Date(dateTimeStr)
        // Use local timezone methods to avoid UTC conversion issues
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    } catch (e) {
        console.error('Date extraction error:', e)
        return ''
    }
}

// Fixed timezone-aware time extraction
const extractTimeFromDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return ''
    try {
        // Create date object and get local time components
        const date = new Date(dateTimeStr)
        // Use local timezone methods to avoid UTC conversion issues
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
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
            const localDate = new Date(newDateTime)
            const localUTCDate = new Date(localDate.getTime() - (5 * 60 + 45) * 60 * 1000);
            const utcIsoString = localUTCDate.toISOString()
            await onSave(utcIsoString)
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
                    value={(() => {
                        const localDateTime = combineDateTime(date, time)
                        return localDateTime ? new Date(localDateTime).toISOString() : ''
                    })()} 
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
