import { useState, useEffect } from 'react';
import Input from "./Input";

export const RepeatScheduleInput = ({ onChange, initialDate = new Date() }) => {
    const [repeatType, setRepeatType] = useState('daily');
    const [interval, setInterval] = useState(1);
    const [selectedDays, setSelectedDays] = useState([]);
    const [weeklyDate, setWeeklyDate] = useState(
        initialDate.toISOString().split('T')[0]
    );
    const [monthlyDate, setMonthlyDate] = useState(
        initialDate.toISOString().split('T')[0]
    );

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

    // Update parent component when values change
    const handleChange = () => {
        if (onChange) {
            const value = generateRepeatValue();
            onChange({
                value: value,
                type: repeatType,
                interval: interval,
                selectedDays: selectedDays,
                weeklyDate: weeklyDate,
                monthlyDate: monthlyDate
            });
        }
    };

    useEffect(() => {
        handleChange();
    }, [repeatType, interval, selectedDays, weeklyDate, monthlyDate]);

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

    const showIntervalInput = ['daily', 'yearly'].includes(repeatType);
    const showWeeklyInterval = repeatType === 'weekly';
    const showMonthlyInterval = repeatType === 'monthly';
    const showWeeklyDateSelector = repeatType === 'weekly';
    const showMonthlyDateSelector = repeatType === 'monthly';
    const showDaySelector = repeatType === 'custom';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
                type="hidden"
                name="repeatEveryNDay"
                id="repeatEveryNDay"
                value={generateRepeatValue()}
            />
            
            <Input
                label="Repeat Type"
                type="select"
                value={repeatType}
                onChange={handleRepeatTypeChange}
                data={repeatTypes}
                required
            />

            {showIntervalInput && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Input
                        label="Every"
                        type="number"
                        value={interval}
                        onChange={handleIntervalChange}
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
                            onChange={handleIntervalChange}
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
                                style={{
                                    padding: '8px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: selectedDays.includes(day.id) ? 'var(--tertiary)' : 'white',
                                    color: selectedDays.includes(day.id) ? 'white' : 'var(--foreground)',
                                    transition: '0.2s ease',
                                    cursor: 'pointer',
                                    fontSize: '12px'
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
        </div>
    );
};

// Helper function to parse and display the repeat schedule
export const getRepeatDescription = (repeatValue) => {
    if (!repeatValue) return 'No repeat';
    
    const parts = repeatValue.split(':');
    if (parts.length < 3) return 'Invalid format';
    
    const [type, dateStr, intervalStr, daysStr] = parts;
    const interval = parseInt(intervalStr) || 1;
    
    switch (type) {
        case 'daily':
            return interval === 1 ? 'Every day' : `Every ${interval} days`;
        case 'weekly':
            return interval === 1 ? 'Every week' : `Every ${interval} weeks`;
        case 'monthly':
            return interval === 1 ? 'Every month' : `Every ${interval} months`;
        case 'yearly':
            return interval === 1 ? 'Every year' : `Every ${interval} years`;
        case 'weekdays':
            return 'Weekdays only (Mon-Fri)';
        case 'custom':
            if (!daysStr) return 'No days selected';
            const selectedDays = daysStr.split(',').map(Number);
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayList = selectedDays.map(id => dayNames[id]).join(', ');
            return `Every ${dayList}`;
        default:
            return 'Custom repeat';
    }
};
