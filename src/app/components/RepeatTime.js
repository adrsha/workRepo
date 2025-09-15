"use client"

import { useState, useEffect, useCallback } from 'react';
import { revFormatColName } from '../lib/utils';
import Input from "./Input";
import "./innerStyles/EditableField.css"

export const RepeatScheduleInput = ({
    initialValue,
    onSave,
    label,
    labelStatic = false,
    placeholder,
    disabled = false,
    initialDate = new Date(),
}) => {
    const [repeatType, setRepeatType] = useState('daily');
    const [interval, setInterval] = useState(1);
    const [selectedDays, setSelectedDays] = useState([]);
    const [weeklyDate, setWeeklyDate] = useState(
        initialDate.toISOString().split('T')[0]
    );
    const [monthlyDate, setMonthlyDate] = useState(
        initialDate.toISOString().split('T')[0]
    );
    const [isUpdating, setIsUpdating] = useState(false);

    const repeatTypes = [
        { id: 'daily', name: 'Daily' },
        { id: 'weekly', name: 'Weekly' },
        { id: 'monthly', name: 'Monthly' },
        { id: 'yearly', name: 'Yearly' },
        { id: 'weekdays', name: 'Weekdays Only' },
        { id: 'custom', name: 'Custom Days' }
    ];

    const weekDays = [
        { id: 0, name: 'Sunday', short: 'Sun' },
        { id: 1, name: 'Monday', short: 'Mon' },
        { id: 2, name: 'Tuesday', short: 'Tue' },
        { id: 3, name: 'Wednesday', short: 'Wed' },
        { id: 4, name: 'Thursday', short: 'Thu' },
        { id: 5, name: 'Friday', short: 'Fri' },
        { id: 6, name: 'Saturday', short: 'Sat' }
    ];

    // Parse initial value if provided
    useEffect(() => {
        if (initialValue) {
            parseInitialValue(initialValue);
        }
    }, [initialValue]);

    const parseInitialValue = (value) => {
        if (!value) return;
        
        const parts = value.split(':');
        if (parts.length < 2) return;
        
        const [type, intervalStr, daysStr] = parts;
        
        setRepeatType(type);
        setInterval(parseInt(intervalStr) || 1);
        
        if (type === 'custom' && daysStr) {
            const days = daysStr.split(',').map(Number).filter(n => !isNaN(n));
            setSelectedDays(days);
        } else if (type === 'weekdays') {
            setSelectedDays([1, 2, 3, 4, 5]);
        }
    };

    const generateRepeatValue = () => {
        switch (repeatType) {
            case 'daily':
                return `daily:${interval}`;
            case 'weekly':
                return `weekly:${interval}`;
            case 'monthly':
                return `monthly:${interval}`;
            case 'yearly':
                return `yearly:${interval}`;
            case 'weekdays':
                return `weekdays:1:1,2,3,4,5`;
            case 'custom':
                return `custom:1:${selectedDays.join(',')}`;
            default:
                return `daily:1`;
        }
    };

    const handleSave = useCallback(async () => {
        const newValue = generateRepeatValue();
        if (newValue === initialValue || isUpdating) return;
        
        setIsUpdating(true);
        try {
            await onSave(newValue);
        } catch (error) {
            console.error("Failed to save repeat schedule:", error);
            // Reset to initial state on error
            parseInitialValue(initialValue);
        } finally {
            setIsUpdating(false);
        }
    }, [initialValue, onSave, isUpdating, repeatType, interval, selectedDays]);

    // Auto-save when values change (with debounce effect)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (!isUpdating) {
                handleSave();
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [repeatType, interval, selectedDays, weeklyDate, monthlyDate, handleSave]);

    const handleRepeatTypeChange = (e) => {
        setRepeatType(e.target.value);
        if (e.target.value === 'weekdays') {
            setSelectedDays([1, 2, 3, 4, 5]);
        }
    };

    const handleIntervalChange = (e) => {
        setInterval(parseInt(e.target.value) || 1);
    };

    const handleWeeklyDateChange = (e) => {
        setWeeklyDate(e.target.value);
    };

    const handleMonthlyDateChange = (e) => {
        setMonthlyDate(e.target.value);
    };

    const handleDayToggle = (dayId) => {
        const newSelectedDays = selectedDays.includes(dayId)
            ? selectedDays.filter(id => id !== dayId)
            : [...selectedDays, dayId].sort((a, b) => a - b);
        
        setSelectedDays(newSelectedDays);
    };

    const getIntervalLabel = () => {
        const labels = {
            daily: interval === 1 ? 'day' : 'days',
            weekly: interval === 1 ? 'week' : 'weeks',
            monthly: interval === 1 ? 'month' : 'months',
            yearly: interval === 1 ? 'year' : 'years'
        };
        return labels[repeatType] || 'interval';
    };

    const currentValue = generateRepeatValue();
    const showIntervalInput = ['daily', 'yearly'].includes(repeatType);
    const showWeeklyInterval = repeatType === 'weekly';
    const showMonthlyInterval = repeatType === 'monthly';
    const showWeeklyDateSelector = repeatType === 'weekly';
    const showMonthlyDateSelector = repeatType === 'monthly';
    const showDaySelector = repeatType === 'custom';

    return (
        <div className="editable-field repeat-time">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                    label="Repeat Type"
                    type="select"
                    value={repeatType}
                    onChange={handleRepeatTypeChange}
                    data={repeatTypes}
                    disabled={disabled || isUpdating}
                    required
                />

                {showIntervalInput && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Input
                            label="Every"
                            type="number"
                            value={interval}
                            onChange={handleIntervalChange}
                            disabled={disabled || isUpdating}
                            required
                        />
                        <span style={{ fontSize: '14px', color: '#666' }}>
                            {getIntervalLabel()}
                        </span>
                    </div>
                )}

                {showWeeklyInterval && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: '0 0 auto' }}>
                            <Input
                                label="Every"
                                type="number"
                                value={interval}
                                onChange={handleIntervalChange}
                                disabled={disabled || isUpdating}
                                required
                            />
                        </div>
                        <span style={{ fontSize: '14px', color: '#666' }}>
                            {interval === 1 ? 'week' : 'weeks'}
                        </span>
                    </div>
                )}

                {showWeeklyDateSelector && (
                    <Input
                        label="Starting Week Date"
                        type="date"
                        value={weeklyDate}
                        onChange={handleWeeklyDateChange}
                        disabled={disabled || isUpdating}
                        required
                    />
                )}

                {showMonthlyInterval && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: '0 0 auto' }}>
                            <Input
                                label="Every"
                                type="number"
                                value={interval}
                                onChange={handleMonthlyDateChange}
                                disabled={disabled || isUpdating}
                                required
                            />
                        </div>
                        <span style={{ fontSize: '14px', color: '#666' }}>
                            {interval === 1 ? 'month' : 'months'}
                        </span>
                    </div>
                )}

                {showMonthlyDateSelector && (
                    <Input
                        label="Starting Month Date"
                        type="date"
                        value={monthlyDate}
                        onChange={handleMonthlyDateChange}
                        disabled={disabled || isUpdating}
                        required
                    />
                )}

                {showDaySelector && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                            Select Days:
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {weekDays.map(day => (
                                <button
                                    key={day.id}
                                    type="button"
                                    onClick={() => handleDayToggle(day.id)}
                                    disabled={disabled || isUpdating}
                                    style={{
                                        padding: '8px 12px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        backgroundColor: selectedDays.includes(day.id) ? 'var(--tertiary)' : 'white',
                                        color: selectedDays.includes(day.id) ? 'white' : 'var(--foreground)',
                                        transition: '0.2s ease',
                                        cursor: disabled || isUpdating ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        opacity: disabled || isUpdating ? 0.6 : 1
                                    }}
                                >
                                    {day.short}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {repeatType === 'weekdays' && (
                    <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                        Repeats Monday through Friday only
                    </div>
                )}

                {isUpdating && (
                    <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                        Updating...
                    </div>
                )}
            </div>
            {/* Hidden input for form submission */}
            {currentValue && (
                <input 
                    type="hidden" 
                    name={labelStatic ? label : revFormatColName(label)} 
                    value={currentValue} 
                />
            )}
        </div>
    );
};
