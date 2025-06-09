"use client"

import { useState, useEffect, useCallback } from "react"
import "./innerStyles/EditableField.css"

const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'Not set';

    try {
        const date = new Date(dateTimeStr);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    } catch (e) {
        console.error('Date formatting error:', e);
        return dateTimeStr;
    }
};

const extractDateFromDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';

    try {
        const date = new Date(dateTimeStr);
        return date.toISOString().split('T')[0];
    } catch (e) {
        console.error('Date extraction error:', e);
        return dateTimeStr;
    }
};

const extractTimeFromDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';

    try {
        const date = new Date(dateTimeStr);
        return date.toTimeString().slice(0, 5);
    } catch (e) {
        console.error('Time extraction error:', e);
        return dateTimeStr;
    }
};

// Single DateTime Component
export const EditableDateTime = ({
    initialDateTime,
    onSave,
    label,
    disabled = false,
    className = "",
    showCurrentValues = false,
    placeholder = "Not set"
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [time, setTime] = useState(extractTimeFromDateTime(initialDateTime) || '');
    const [date, setDate] = useState(extractDateFromDateTime(initialDateTime) || '');

    // Sync with parent component when props change
    useEffect(() => {
        setTime(extractTimeFromDateTime(initialDateTime) || '');
        setDate(extractDateFromDateTime(initialDateTime) || '');
    }, [initialDateTime]);

    const handleSave = useCallback(() => {
        // Combine date and time into ISO string
        const formattedDateTime = date && time ? `${date}T${time}:00` : '';
        onSave(formattedDateTime);
        setIsEditing(false);
    }, [date, time, onSave]);

    const handleCancel = () => {
        setIsEditing(false);
        setTime(extractTimeFromDateTime(initialDateTime) || '');
        setDate(extractDateFromDateTime(initialDateTime) || '');
    };

    return (
        <div className={`editable-field ${className} ${disabled ? 'disabled' : ''}`}>
            <div className="editable-field__header">
                <label htmlFor={`datetime-${label}`} className="editable-field__label">
                    {label}
                </label>
                {showCurrentValues && (date || time) && !isEditing && (
                    <span className="editable-field__current-value">
                        {date} {time}
                    </span>
                )}
            </div>

            {isEditing ? (
                <div className="editable-field__controls">
                    <div className="editable-field__date-time-inputs">
                        <div className="editable-field__input-group">
                            <label htmlFor={`date-${label}`} className="editable-field__input-label">
                                Date:
                            </label>
                            <input
                                type="date"
                                id={`date-${label}`}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="editable-field__input"
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
                                onChange={(e) => setTime(e.target.value)}
                                className="editable-field__input"
                            />
                        </div>
                    </div>

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
                    <span className="editable-field__text">
                        {formatDateTime(initialDateTime) || placeholder}
                    </span>
                    {!disabled && (
                        <span className="editable-field__icon">✏️</span>
                    )}
                </div>
            )}
        </div>
    );
};

// Convenience components for start and end times
export const EditableStartTime = (props) => (
    <EditableDateTime
        {...props}
        label={props.label || "Start Time"}
        placeholder={props.placeholder || "No start time set"}
    />
);

export const EditableEndTime = (props) => (
    <EditableDateTime
        {...props}
        label={props.label || "End Time"}
        placeholder={props.placeholder || "No end time set"}
    />
);
