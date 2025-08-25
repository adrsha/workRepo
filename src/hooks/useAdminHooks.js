import { useState, useEffect, useCallback } from 'react';
import { getStoredTab, setStoredTab } from '../app/lib/utils';
import { formatDateTime } from '@/utils/dateTime';

export const usePersistedTab = () => {
    const [activeTab, setActiveTab] = useState(getStoredTab);

    useEffect(() => {
        setStoredTab(activeTab);
    }, [activeTab]);

    return [activeTab, setActiveTab];
};

export const useAsyncAction = () => {
    const [actionInProgress, setActionInProgress] = useState({});

    const startAction = (key) =>
        setActionInProgress(prev => ({ ...prev, [key]: true }));

    const endAction = (key) =>
        setActionInProgress(prev => {
            const { [key]: _, ...rest } = prev;
            return rest;
        });

    return { actionInProgress, startAction, endAction };
};

export const useAdminLookups = (state) => {
    const getUserName = useCallback((userId) => {
        return state.usersData.find(user => user.user_id == userId)?.user_name || 'Unknown User'
    }, [state.usersData]);

    const getClassName = useCallback((classId) => {
        const classData = state.classesData.find(c => c.class_id == classId);
        if (!classData) return 'Unknown Class';

        const courseName = state.courseData.find(c => c.course_id == classData.course_id)?.course_name || 'Unknown Course';
        const startFormatted = formatDateTime(classData.start_time);
        const endFormatted = formatDateTime(classData.end_time);

        return `${courseName} - ${getUserName(classData.teacher_id)} from ${startFormatted} to ${endFormatted}`;
    }, [state.classesData, state.courseData, getUserName]);

    return { getUserName, getClassName };
};
