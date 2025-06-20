export const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'TBD';

    try {
        if (!dateTimeString.includes('T') && !dateTimeString.endsWith('Z')) {
            return dateTimeString;
        }

        const date = new Date(dateTimeString);
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        }).format(date);
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateTimeString;
    }
};

export const isClassActive = (startTime, endTime) => {
    if (!startTime || !endTime) return false;
    const now = new Date();
    return now >= new Date(startTime) && now <= new Date(endTime);
};

export const isClassInPast = (endTime) => {
    if (!endTime) return false;
    return new Date() > new Date(endTime);
};

export const isValidClassDay = (startTime, repeatNDays) => {
    if (!startTime || !repeatNDays) return true;
    
    const classStartDate = new Date(startTime);
    const today = new Date();
    
    classStartDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - classStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return false;
    
    return diffDays % repeatNDays === 0;
};

export const isClassJoinable = (startTime, endTime, repeatNDays) => {
    if (!startTime || !endTime) return false;
    
    const now = new Date();
    const classStart = new Date(startTime);
    const classEnd = new Date(endTime);
    
    const todayStart = new Date(now);
    todayStart.setHours(classStart.getHours(), classStart.getMinutes(), classStart.getSeconds(), classStart.getMilliseconds());
    
    const todayEnd = new Date(now);
    todayEnd.setHours(classEnd.getHours(), classEnd.getMinutes(), classEnd.getSeconds(), classEnd.getMilliseconds());
    
    const withinTimeWindow = now >= todayStart && now <= todayEnd;
    const validDay = isValidClassDay(startTime, repeatNDays);
    
    return withinTimeWindow && validDay;
};

export const canTeacherGenerateLink = (startTime, endTime, repeatNDays) => {
    if (!startTime) return false;
    
    const now = new Date();
    const classStart = new Date(startTime);
    const classEnd = new Date(endTime);
    
    if (repeatNDays) {
        const validDay = isValidClassDay(startTime, repeatNDays);
        if (!validDay) return false;
        
        const todayEnd = new Date(now);
        todayEnd.setHours(classEnd.getHours(), classEnd.getMinutes(), classEnd.getSeconds(), classEnd.getMilliseconds());
        
        return now <= todayEnd;
    }
    
    return now <= classEnd;
};
