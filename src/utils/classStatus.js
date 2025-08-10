// utils/classStatus.js
import { getDate } from './dateTime.js';

/**
 * Parse repeat pattern string into structured object
 * @param {string} repeatPattern - Pattern like "daily:1" or "custom:1:0,2,3"
 * @returns {object|null} Parsed pattern or null if invalid
 */
export const parseRepeatPattern = (repeatPattern) => {
    if (!repeatPattern || typeof repeatPattern !== 'string') return null;

    const parts = repeatPattern.split(':');
    if (parts.length < 2) return null;

    const pattern = {
        type: parts[0],
        interval: parseInt(parts[1]),
        days: null
    };

    // For custom patterns, parse the days
    if (parts[2]) {
        pattern.days = parts[2].split(',').map(d => parseInt(d));
    }

    return pattern;
};

/**
 * Create normalized Date object from ISO string using getDate utility
 * @param {string} dateString - ISO date string
 * @returns {Date} Normalized Date object
 */
const createDateFromString = (dateString) => {
    const { yyyymmdd, hhmmss } = getDate(dateString);
    return new Date(`${yyyymmdd}T${hhmmss}`);
};

/**
 * Get date-only representation (midnight) of a date
 * @param {Date} date - Input date
 * @returns {Date} Date set to midnight
 */
const getDateOnly = (date) => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly;
};

/**
 * Check if class is available on a specific date
 * @param {string} startTime - ISO string of class start time
 * @param {string} endTime - ISO string of class end time  
 * @param {string} repeatPattern - Repeat pattern string
 * @param {Date} checkDate - Date to check (defaults to today)
 * @returns {boolean} Whether class is available on the date
 */
export const isClassAvailableOnDate = (startTime, endTime, repeatPattern, checkDate = new Date()) => {
    if (!startTime) return false;

    const classStart = createDateFromString(startTime);
    const targetDate = new Date(checkDate);
    
    if (!repeatPattern) {
        const targetDateOnly = getDateOnly(targetDate);
        const classDateOnly = getDateOnly(classStart);
        return targetDateOnly.getTime() === classDateOnly.getTime();
    }

    // For recurring classes
    const pattern = parseRepeatPattern(repeatPattern);
    if (!pattern) return false;

    const targetDateOnly = getDateOnly(targetDate);
    const startDateOnly = getDateOnly(classStart);

    // Check if target date is before class start date
    if (targetDateOnly < startDateOnly) return false;

    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysSinceStart = Math.floor((targetDateOnly - startDateOnly) / (1000 * 60 * 60 * 24));
    switch (pattern.type) {
        case 'daily':
            return daysSinceStart % pattern.interval === 0;

        case 'weekly':
            const weeksSinceStart = Math.floor(daysSinceStart / 7);
            return weeksSinceStart % pattern.interval === 0 && dayOfWeek === classStart.getDay();

        case 'monthly':
            const startMonth = classStart.getMonth();
            const startYear = classStart.getFullYear();
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();
            const monthsDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);
            return monthsDiff % pattern.interval === 0 && targetDate.getDate() === classStart.getDate();

        case 'weekdays':
            return dayOfWeek >= 1 && dayOfWeek <= 5;

        case 'custom':
            return pattern.days?.includes(dayOfWeek) || false;

        default:
            return false;
    }
};

/**
 * Check if class is available today
 * @param {string} startTime - ISO string of class start time
 * @param {string} endTime - ISO string of class end time
 * @param {string} repeatPattern - Repeat pattern string
 * @returns {boolean} Whether class is available today
 */
export const isClassAvailableToday = (startTime, endTime, repeatPattern) => {
    return isClassAvailableOnDate(startTime, endTime, repeatPattern, new Date());
};

/**
 * Get time status for a class on current day
 * @param {string} startTime - ISO string of class start time
 * @param {string} endTime - ISO string of class end time
 * @returns {'before'|'during'|'after'} Current time status
 */
export const getTimeStatus = (startTime, endTime) => {
    const now = new Date();
    const classStart = createDateFromString(startTime);
    const classEnd = createDateFromString(endTime);
    
    // Set today's class times
    const todayStart = new Date();
    todayStart.setHours(classStart.getHours(), classStart.getMinutes(), classStart.getSeconds(), 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(classEnd.getHours(), classEnd.getMinutes(), classEnd.getSeconds(), 0);
    
    if (now < todayStart) return 'before';
    if (now >= todayStart && now <= todayEnd) return 'during';
    return 'after';
};

/**
 * Check if class is currently joinable
 * @param {string} startTime - ISO string of class start time
 * @param {string} endTime - ISO string of class end time
 * @param {string} repeatPattern - Repeat pattern string
 * @returns {boolean} Whether class can be joined right now
 */
export const isClassCurrentlyJoinable = (startTime, endTime, repeatPattern) => {
    if (!isClassAvailableToday(startTime, endTime, repeatPattern)) return false;

    const timeStatus = getTimeStatus(startTime, endTime);
    return timeStatus === 'during';
};

/**
 * Get meeting status for display
 * @param {string} startTime - ISO string of class start time
 * @param {string} endTime - ISO string of class end time
 * @param {string} repeatPattern - Repeat pattern string
 * @returns {'active'|'inactive'|'notToday'|'scheduled'} Status for display
 */
export const getMeetingStatus = (startTime, endTime, repeatPattern) => {
    const isJoinable = isClassCurrentlyJoinable(startTime, endTime, repeatPattern);
    console.log(isJoinable, startTime, endTime, repeatPattern);
    if (isJoinable) return 'active';

    if (repeatPattern) {
        const isValidDay = isClassAvailableToday(startTime, endTime, repeatPattern);
        if (!isValidDay) return 'notToday';
        return 'scheduled';
    } else {
        const classEnd = createDateFromString(endTime);
        const isInPast = new Date() > classEnd;
        if (isInPast) return 'inactive';
        return 'scheduled';
    }
};

/**
 * Get human-readable status text
 * @param {'active'|'inactive'|'notToday'|'scheduled'} status - Status from getMeetingStatus
 * @returns {string} Human-readable status
 */
export const getStatusText = (status) => {
    switch (status) {
        case 'active': return 'Active';
        case 'inactive': return 'Ended';
        case 'notToday': return 'Not Today';
        default: return 'Scheduled';
    }
};

/**
 * Format recurrence pattern for display
 * @param {string} repeatPattern - Repeat pattern string
 * @returns {string|null} Formatted recurrence text
 */
export const formatRecurrence = (repeatPattern) => {
    const pattern = parseRepeatPattern(repeatPattern);
    if (!pattern) return null;

    switch (pattern.type) {
        case 'daily':
            return pattern.interval === 1 ? 'Daily' : `Every ${pattern.interval} days`;

        case 'weekly':
            return pattern.interval === 1 ? 'Weekly' : `Every ${pattern.interval} weeks`;

        case 'monthly':
            return pattern.interval === 1 ? 'Monthly' : `Every ${pattern.interval} months`;

        case 'weekdays':
            return 'Weekdays only (Mon-Fri)';

        case 'custom':
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const selectedDays = pattern.days ? pattern.days.map(d => dayNames[d]).join(', ') : '';
            return `Custom: ${selectedDays}`;

        default:
            return 'Custom schedule';
    }
};

/**
 * Find next and previous class occurrences for recurring patterns
 * @param {string} startTime - ISO string of class start time
 * @param {string} repeatPattern - Repeat pattern string
 * @returns {{next: Date|null, previous: Date|null}} Next and previous occurrence dates
 */
export const findClassOccurrences = (startTime, repeatPattern) => {
    const pattern = parseRepeatPattern(repeatPattern);
    if (!pattern) return { next: null, previous: null };

    const today = new Date();
    const startDate = createDateFromString(startTime);
    let nextDate = null;
    let previousDate = null;

    // Check 30 days back and 365 days forward
    for (let i = -30; i <= 365; i++) {
        const checkDate = new Date(startDate);
        
        switch (pattern.type) {
            case 'daily':
                checkDate.setDate(startDate.getDate() + (i * pattern.interval));
                break;
            case 'weekly':
                checkDate.setDate(startDate.getDate() + (i * 7 * pattern.interval));
                break;
            case 'weekdays':
                checkDate.setDate(startDate.getDate() + i);
                const dayOfWeek = checkDate.getDay();
                if (dayOfWeek < 1 || dayOfWeek > 5) continue; // Skip weekends
                break;
            case 'custom':
                checkDate.setDate(startDate.getDate() + i);
                if (!pattern.days?.includes(checkDate.getDay())) continue;
                break;
            default:
                continue;
        }

        const checkDateOnly = getDateOnly(checkDate);
        const todayOnly = getDateOnly(today);

        if (checkDateOnly.getTime() === todayOnly.getTime()) continue; // Skip today

        if (checkDateOnly > todayOnly && !nextDate) {
            nextDate = checkDate;
        }
        if (checkDateOnly < todayOnly) {
            previousDate = checkDate;
        }
    }

    return { next: nextDate, previous: previousDate };
};
