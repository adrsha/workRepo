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
