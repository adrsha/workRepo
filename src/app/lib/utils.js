export const getCols = (array) => {
    if (!array?.length) return [];
    return array.reduce((acc, obj) =>
        acc.filter(key => Object.hasOwnProperty.call(obj, key)),
        Object.keys(array[0])
    );
};

export const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'Not set';

    try {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(new Date(dateTimeStr));
    } catch {
        return dateTimeStr;
    }
};

export const formatColName = (colName) =>
    colName.replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^\w/, c => c.toUpperCase())
        .trim();

export const TABS = { TEACHERS: 0, CLASSES: 1, STUDENTS: 2 };
export const STORAGE_KEY = 'adminActiveTab';

export const getStoredTab = () => {
    if (typeof window === 'undefined') return TABS.TEACHERS;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : TABS.TEACHERS;
};

export const setStoredTab = (tab) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, tab.toString());
    }
};

export const revFormatColName = (label) => {
    if (!label) return ""
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export function formatRepeatPattern(repeatString) {
    if (!repeatString || typeof repeatString !== 'string') {
        return 'One time';
    }
    
    const parts = repeatString.split(':');
    if (parts.length < 2) {
        return parts[0] + " days";
    }
    const [type, interval, ...rest] = parts;
    const intervalNum = parseInt(interval);

    switch (type) {
        case 'daily':
            return intervalNum === 1 ? 'Daily' : `Every ${intervalNum} days`;

        case 'weekly':
            return intervalNum === 1 ? 'Weekly' : `Every ${intervalNum} weeks`;

        case 'monthly':
            return intervalNum === 1 ? 'Monthly' : `Every ${intervalNum} months`;

        case 'weekdays':
            return 'Weekdays only';

        case 'custom':
            if (rest.length === 0) return 'Custom schedule';

            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const selectedDays = rest[0].split(',')
                .map(day => dayNames[parseInt(day)])
                .filter(Boolean);

            return selectedDays.length > 0
                ? `Every ${selectedDays.join(', ')}`
                : 'Custom schedule';

        default:
            return 'Custom schedule';
    }
}
