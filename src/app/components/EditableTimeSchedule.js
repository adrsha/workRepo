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
    return dateTimeStr; // Return original string if parsing fails
  }
};

const extractDateFromDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';

  try {
    const date = new Date(dateTimeStr);
    return date.toISOString().split('T')[0]; // Get YYYY-MM-DD format for date input
  } catch (e) {
    console.error('Date extraction error:', e);
    return dateTimeStr; // Return original if it's already in date format
  }
};

// Helper to extract just the time portion from datetime for input fields
const extractTimeFromDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';

  try {
    const date = new Date(dateTimeStr);
    return date.toTimeString().slice(0, 5); // Get HH:MM format
  } catch (e) {
    console.error('Time extraction error:', e);
    return dateTimeStr; // Return original if it's already in time format
  }
};

export const EditableTimeSchedule = ({
  initialStartTime,
  initialEndTime,
  onSave,
  label,
  disabled = false,
  className = "",
  showCurrentValues = false,
  placeholder = "No schedule set"
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [startTime, setStartTime] = useState(extractTimeFromDateTime(initialStartTime) || '');
  const [startDate, setStartDate] = useState(extractDateFromDateTime(initialStartTime) || '');
  const [endTime, setEndTime] = useState(extractTimeFromDateTime(initialEndTime) || '');
  const [endDate, setEndDate] = useState(extractDateFromDateTime(initialEndTime) || '');
  const [error, setError] = useState(""); // For validation errors

  // Sync with parent component when props change
  useEffect(() => {
    setStartTime(extractTimeFromDateTime(initialStartTime) || '');
    setEndTime(extractTimeFromDateTime(initialEndTime) || '');
    setStartDate(extractDateFromDateTime(initialStartTime) || '');
    setEndDate(extractDateFromDateTime(initialEndTime) || '');
  }, [initialStartTime, initialEndTime]);

  const validateDateTimes = () => {
    // Only validate if both dates and times are provided
    if (startDate && startTime && endDate && endTime) {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      if (end <= start) {
        setError("End date/time must be after start date/time");
        return false;
      }
    }
    setError("");
    return true;
  };

  const handleSave = useCallback(() => {
    if (validateDateTimes()) {
      // Combine date and time into ISO strings
      const formattedStartDateTime = startDate && startTime ? `${startDate}T${startTime}:00` : '';
      const formattedEndDateTime = endDate && endTime ? `${endDate}T${endTime}:00` : '';

      onSave(formattedStartDateTime, formattedEndDateTime);
      setIsEditing(false);
    }
  }, [startDate, startTime, endDate, endTime, onSave]);

  const handleCancel = () => {
    setIsEditing(false);
    setStartTime(extractTimeFromDateTime(initialStartTime) || '');
    setEndTime(extractTimeFromDateTime(initialEndTime) || '');
    setStartDate(extractDateFromDateTime(initialStartTime) || '');
    setEndDate(extractDateFromDateTime(initialEndTime) || '');
    setError("");
  };

  // Format the display time
  const formatTimeDisplay = (start, end) => {
    if (!start && !end) return placeholder;
    if (!start) return `End: ${formatDateTime(end)}`;
    if (!end) return `Start: ${formatDateTime(start)}`;
    return `${formatDateTime(start)} to ${formatDateTime(end)}`;
  };

  return (
    <div className={`editable-field ${className} ${disabled ? 'disabled' : ''}`}>
      <div className="editable-field__header">
        <label htmlFor={`time-${label}-start`} className="editable-field__label">
          {label}
        </label>
        {showCurrentValues && (startDate || endDate) && !isEditing && (
          <span className="editable-field__current-value">
            {startDate ? `Start: ${startDate} ${startTime}` : ''}
            {startDate && endDate ? ' | ' : ''}
            {endDate ? `End: ${endDate} ${endTime}` : ''}
          </span>
        )}
      </div>

      {isEditing ? (
        <div className="editable-field__controls">
          <div className="editable-field__date-time-inputs">
            <div className="editable-field__input-group">
              <label htmlFor={`date-${label}-start`} className="editable-field__input-label">
                Start Date:
              </label>
              <input
                type="date"
                id={`date-${label}-start`}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (error) validateDateTimes();
                }}
                className="editable-field__input"
              />
            </div>

            <div className="editable-field__input-group">
              <label htmlFor={`time-${label}-start`} className="editable-field__input-label">
                Start Time:
              </label>
              <input
                type="time"
                id={`time-${label}-start`}
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (error) validateDateTimes();
                }}
                className="editable-field__input"
              />
            </div>

            <div className="editable-field__input-group">
              <label htmlFor={`date-${label}-end`} className="editable-field__input-label">
                End Date:
              </label>
              <input
                type="date"
                id={`date-${label}-end`}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (error) validateDateTimes();
                }}
                className="editable-field__input"
              />
            </div>

            <div className="editable-field__input-group">
              <label htmlFor={`time-${label}-end`} className="editable-field__input-label">
                End Time:
              </label>
              <input
                type="time"
                id={`time-${label}-end`}
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  if (error) validateDateTimes();
                }}
                className="editable-field__input"
              />
            </div>
          </div>

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
          <span className="editable-field__text">
            {formatTimeDisplay(initialStartTime, initialEndTime)}
          </span>
          {!disabled && (
            <span className="editable-field__icon">✏️</span>
          )}
        </div>
      )}
    </div>
  );
};
