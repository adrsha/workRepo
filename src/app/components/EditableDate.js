"use client"

import { useState, useCallback, useEffect } from "react"
import { revFormatColName } from '../lib/utils';
import "./innerStyles/EditableField.css"

export const EditableDate = ({ initialDate, onSave, label }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [date, setDate] = useState(initialDate || '');
    // Sync with parent component when props change
    useEffect(() => {
        setDate(initialDate || '');
    }, [initialDate]);

    const handleSave = useCallback(() => {
        onSave(date);
        setIsEditing(false);
    }, [date, onSave]);

    const formatDateDisplay = (d) => {
        return d ? d : 'No date set';
    };

    return (
        <div className="editable-field">
            {isEditing ? (
                <div className="edit-controls date-controls">
                    <div className="date-input-group">
                        <label>Date:</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div className="button-group">
                        <button onClick={handleSave}>Save</button>
                        <button onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="display-value" onClick={() => setIsEditing(true)}>
                    {formatDateDisplay(date)}
                    {data && <input type="hidden" value={date} name={revFormatColName(label)}/>}
                </div>
            )}
        </div>
    );
};
