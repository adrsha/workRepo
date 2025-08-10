import { useState, useEffect, useCallback } from 'react';
import { fetchData, fetchViewData } from '../app/lib/helpers.js';

const TABS = { TEACHERS: 0, CLASSES: 1, STUDENTS: 2, COURSES: 3};

export const useAdminData = (initialPendingTeachers = []) => {
    const [state, setState] = useState({
        studentsQueued: [],
        classesData: [],
        teachersData: [],
        courseData: [],
        studentsData: [],
        gradesData: [],
        pendingTeachersData: initialPendingTeachers,
        usersData: [],
        classesUsersData: [], // New: junction table data
        isLoading: false,
        error: null,
        loadedTabs: new Set(),
    });

    const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

    const updateArrayState = (key, updater) =>
        setState(prev => ({ ...prev, [key]: updater(prev[key]) }));

    const markTabLoaded = (tab) =>
        setState(prev => ({
            ...prev,
            loadedTabs: new Set([...prev.loadedTabs, tab])
        }));

    const loadInitialData = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        try {
            const [pendingStudents, users] = await Promise.all([
                fetchData('class_joining_pending', authToken),
                fetchData('users', authToken)
            ]);

            updateState({ studentsQueued: pendingStudents, usersData: users });
        } catch (err) {
            console.error('Error loading initial data:', err);
            updateState({ error: 'Failed to load student queue data. Please try again.' });
        }
    }, []);

    const loadTabData = useCallback(async (tabIndex) => {
        const authToken = localStorage.getItem('authToken');

        if (state.loadedTabs.has(tabIndex)) {
            return;
        }

        updateState({ isLoading: true, error: null });
        try {
            switch (tabIndex) {
                case TABS.TEACHERS: {
                    const [teachers, pendingTeachers] = await Promise.all([
                        fetchViewData('teachers_view', authToken),
                        fetchData('pending_teachers', authToken)
                    ]);
                    updateState({
                        teachersData: teachers,
                        pendingTeachersData: pendingTeachers
                    });
                    break;
                }

                case TABS.CLASSES: {
                    const [classes, courses, grades, teachers, classesUsers, users] = await Promise.all([
                        fetchData('classes', authToken),
                        fetchData('courses', authToken),
                        fetchData('grades', authToken),
                        fetchViewData('teachers_view', authToken),
                        fetchData('classes_users', authToken), // Fetch junction table data
                        fetchData('users', authToken) // Fetch all users for student details
                    ]);
                    updateState({
                        classesData: classes,
                        courseData: courses,
                        gradesData: grades,
                        teachersData: teachers,
                        classesUsersData: classesUsers, 
                        usersData: users 
                    });
                    break;
                }

                case TABS.STUDENTS: {
                    const [classes, courses, students, studentsQueue, users, classesUsers] = await Promise.all([
                        fetchData('classes', authToken),
                        fetchData('courses', authToken),
                        fetchViewData('students_view', authToken),
                        fetchData('class_joining_pending', authToken),
                        fetchData('users', authToken),
                        fetchData('classes_users', authToken) // Also fetch for students tab
                    ]);
                    updateState({
                        classesData: classes,
                        courseData: courses,
                        studentsData: students,
                        studentsQueued: studentsQueue,
                        usersData: users,
                        classesUsersData: classesUsers // Store junction table data
                    });
                    break;
                }
                case TABS.COURSES: {
                    const courses = await fetchData('courses', authToken);
                    updateState({ courseData: courses });
                    break;
                }
            }
            markTabLoaded(tabIndex);
        } catch (err) {
            console.error('Error loading tab data:', err);
            const tabName = ['teachers', 'classes', 'students'][tabIndex];
            updateState({ error: `Failed to load ${tabName} data.` });
        } finally {
            updateState({ isLoading: false });
        }
    }, [state.loadedTabs]);

    const resetData = () => {
        setState(prev => ({
            ...prev,
            error: null,
            loadedTabs: new Set()
        }));
    };

    return {
        state,
        updateState,
        updateArrayState,
        loadInitialData,
        loadTabData,
        resetData
    };
};
