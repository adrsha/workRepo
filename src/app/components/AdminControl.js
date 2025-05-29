'use client';

import './innerStyles/AdminControl.css';
import './innerStyles/EditableField.css';
import { useState, useEffect, useCallback } from 'react';
import { fetchData, fetchViewData } from '../lib/helpers.js';
import { EditableField } from '../components/EditableField';
import { EditableDate } from '../components/EditableDate';
import { EditableDropdown } from '../components/EditableDropdown';
import { EditableTimeSchedule } from '../components/EditableTimeSchedule';
import { useSession } from 'next-auth/react';

// Constants
const TABS = { TEACHERS: 0, CLASSES: 1, STUDENTS: 2 };
const STORAGE_KEY = 'adminActiveTab';

// Utility functions
const getCols = (array) => {
    if (!array?.length) return [];
    return array.reduce((acc, obj) => 
        acc.filter(key => Object.hasOwn(obj, key)), 
        Object.keys(array[0])
    );
};

const formatDateTime = (dateTimeStr) => {
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

const formatColName = (colName) => 
    colName.replace(/_/g, ' ')
           .replace(/([A-Z])/g, ' $1')
           .replace(/^\w/, c => c.toUpperCase())
           .trim();

const getStoredTab = () => {
    if (typeof window === 'undefined') return TABS.TEACHERS;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : TABS.TEACHERS;
};

const setStoredTab = (tab) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, tab.toString());
    }
};

// API functions
const actionTeacher = async (pendingId, approved) => {
    const authToken = localStorage.getItem('authToken');
    
    const response = await fetch('/api/pendingTeachers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pendingId, approved }),
    });

    if (!response.ok) {
        throw new Error(`Failed to ${approved ? 'approve' : 'deny'} teacher`);
    }
    
    return response.json();
};

const updateData = async (table, id, updates) => {
    const response = await fetch('/api/changeData', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, updates }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update ${table}`);
    }
    
    return response.json();
};

const processStudentAction = async (endpoint, data) => {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
    }
    
    return response.json();
};

// Custom hooks
const usePersistedTab = () => {
    const [activeTab, setActiveTab] = useState(getStoredTab);
    
    useEffect(() => {
        setStoredTab(activeTab);
    }, [activeTab]);
    
    return [activeTab, setActiveTab];
};

const useAsyncAction = () => {
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

// Main component
export default function AdminControl({ pendingTeachersData: initialPendingTeachers = [] }) {
    const [activeTab, setActiveTab] = usePersistedTab();
    const { actionInProgress, startAction, endAction } = useAsyncAction();
    const { data: session, update } = useSession();
    
    // State
    const [state, setState] = useState({
        studentsQueued: [],
        classesData: [],
        teachersData: [],
        courseData: [],
        studentsData: [],
        gradesData: [],
        pendingTeachersData: initialPendingTeachers,
        usersData: [],
        isLoading: true,
        error: null,
    });

    // State updaters
    const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));
    
    const updateArrayState = (key, updater) => 
        setState(prev => ({ ...prev, [key]: updater(prev[key]) }));

    // Memoized lookups
    const getUserName = useCallback((userId) => 
        state.usersData.find(user => user.user_id == userId)?.user_name || 'Unknown User',
        [state.usersData]
    );

    const getClassName = useCallback((classId) => {
        const classData = state.classesData.find(c => c.class_id == classId);
        if (!classData) return 'Unknown Class';

        const courseName = state.courseData.find(c => c.course_id == classData.course_id)?.course_name || 'Unknown Course';
        const startFormatted = formatDateTime(classData.start_time);
        const endFormatted = formatDateTime(classData.end_time);

        return `${courseName} - ${getUserName(classData.teacher_id)} from ${startFormatted} to ${endFormatted}`;
    }, [state.classesData, state.courseData, getUserName]);

    // Data loading
    const loadInitialData = async () => {
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
    };

    const loadTabData = async () => {
        const authToken = localStorage.getItem('authToken');
        updateState({ isLoading: true });

        try {
            switch (activeTab) {
                case TABS.TEACHERS:
                    if (!state.teachersData.length) {
                        const teachers = await fetchViewData('teachers_view');
                        updateState({ teachersData: teachers });
                    }
                    const pendingTeachers = await fetchViewData('pending_teachers_view', authToken);
                    updateState({ pendingTeachersData: pendingTeachers });
                    break;

                case TABS.CLASSES:
                    if (!state.classesData.length) {
                        const [classes, courses, grades, teachers] = await Promise.all([
                            fetchData('classes', authToken),
                            fetchData('courses', authToken),
                            fetchData('grades', authToken),
                            fetchViewData('teachers_view', authToken)
                        ]);
                        updateState({ 
                            classesData: classes, 
                            courseData: courses, 
                            gradesData: grades, 
                            teachersData: teachers 
                        });
                    }
                    break;

                case TABS.STUDENTS:
                    if (!state.studentsData.length) {
                        const [classes, courses, students, studentsQueue] = await Promise.all([
                            fetchData('classes', authToken),
                            fetchData('courses', authToken),
                            fetchViewData('students_view'),
                            fetchData('class_joining_pending', authToken)
                        ]);
                        updateState({
                            classesData: classes,
                            courseData: courses,
                            studentsData: students,
                            studentsQueued: studentsQueue
                        });
                    }
                    break;
            }
            updateState({ error: null });
        } catch (err) {
            console.error('Error loading tab data:', err);
            const tabName = ['teachers', 'classes', 'students'][activeTab];
            updateState({ error: `Failed to load ${tabName} data.` });
        } finally {
            updateState({ isLoading: false });
        }
    };

    // Effects
    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadTabData();
    }, [activeTab]);

    // Action handlers
    const handleSaveData = useCallback(async (table, id, column, value) => {
        if (!session) return;

        const actionKey = `${table}-${id}-${column}`;
        startAction(actionKey);

        try {
            await updateData(table, id, { [column]: value });
            
            const stateKey = {
                classes: 'classesData',
                students: 'studentsData', 
                teachers: 'teachersData',
                courses: 'courseData',
                grades: 'gradesData',
                users: 'usersData'
            }[table];

            if (stateKey) {
                const idField = table === 'classes' ? 'class_id' : 'user_id';
                updateArrayState(stateKey, data => 
                    data.map(item => item[idField] === id ? { ...item, [column]: value } : item)
                );
            }
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            alert(`Failed to update ${table}: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    }, [session, startAction, endAction]);

    const handleMultiSaveData = useCallback(async (table, id, updates) => {
        if (!session) return;

        const actionKey = `${table}-${id}-multi`;
        startAction(actionKey);

        try {
            await updateData(table, id, updates);
            
            const stateKey = {
                classes: 'classesData',
                students: 'studentsData',
                teachers: 'teachersData',
                courses: 'courseData',
                grades: 'gradesData'
            }[table];

            if (stateKey) {
                const idField = table === 'classes' ? 'class_id' : 'user_id';
                updateArrayState(stateKey, data =>
                    data.map(item => item[idField] === id ? { ...item, ...updates } : item)
                );
            }
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            alert(`Failed to update ${table}: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    }, [session, startAction, endAction]);

    const handleTeacherAction = useCallback(async (pendingId, approved) => {
        const actionKey = `teacher-${approved ? 'approve' : 'deny'}-${pendingId}`;
        startAction(actionKey);

        try {
            await actionTeacher(pendingId, approved);
            updateArrayState('pendingTeachersData', data => 
                data.filter(teacher => teacher.pending_id !== pendingId)
            );

            if (approved) {
                const updatedTeachers = await fetchViewData('teachers_view');
                updateState({ teachersData: updatedTeachers });
            }
        } catch (error) {
            console.error('Failed to process teacher action:', error);
            alert(`Failed to ${approved ? 'approve' : 'deny'} teacher: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    }, [startAction, endAction]);

    const handleStudentQueueApproval = useCallback(async (classId, userId, pendingId) => {
        const actionKey = `student-approve-${pendingId}`;
        startAction(actionKey);

        try {
            await processStudentAction('/api/acceptPayment', { classId, userId, pendingId });
            
            updateArrayState('studentsQueued', data => 
                data.filter(student => student.pending_id !== pendingId)
            );

            const updatedStudents = await fetchViewData('students_view');
            updateState({ studentsData: updatedStudents });
            update();
        } catch (error) {
            console.error('Error:', error);
            alert(`Failed to approve student: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    }, [startAction, endAction, update]);

    const handleStudentQueueRejection = useCallback(async (pendingId) => {
        const actionKey = `student-reject-${pendingId}`;
        startAction(actionKey);

        try {
            await processStudentAction('/api/rejectPayment', { pendingId });
            
            updateArrayState('studentsQueued', data => 
                data.filter(student => student.pending_id !== pendingId)
            );
            update();
        } catch (error) {
            console.error('Error:', error);
            alert(`Failed to reject student: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    }, [startAction, endAction, update]);

    // Field change handlers
    const handleFieldChange = useCallback((field, table = 'classes') => 
        (id, value) => handleSaveData(table, id, field, value),
        [handleSaveData]
    );

    const handleScheduleChange = useCallback((classId, startTime, endTime) => 
        handleMultiSaveData('classes', classId, { start_time: startTime, end_time: endTime }),
        [handleMultiSaveData]
    );

    // Render helpers
    const renderButton = (text, onClick, disabled, className = '') => (
        <button className={className} onClick={onClick} disabled={disabled} key={className}>
            {disabled ? 'Processing...' : text}
        </button>
    );

    const renderActionButtons = (item, type, actions) => (
        <td>
            {actions.map(({ text, action, key }) => 
                renderButton(
                    text,
                    () => action(item),
                    actionInProgress[`${type}-${key}-${item.pending_id || item.user_id}`],
                    `${key}-btn`
                )
            )}
        </td>
    );

    // Tab renderers
    const renderTeachersTab = () => (
        <>
            <section className="teachers-section">
                <h3 className="headers">Pending Teachers</h3>
                {state.pendingTeachersData.length > 0 ? (
                    <table className="teachers-table">
                        <thead>
                            <tr>
                                {getCols(state.pendingTeachersData).map(col => 
                                    <th key={col}>{formatColName(col)}</th>
                                )}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.pendingTeachersData.map(teacher => (
                                <tr key={`pending-${teacher.pending_id}`}>
                                    {getCols(state.pendingTeachersData).map(col => 
                                        <td key={`${teacher.pending_id}-${col}`}>{teacher[col]}</td>
                                    )}
                                    {renderActionButtons(teacher, 'teacher', [
                                        { text: 'Approve', action: t => handleTeacherAction(t.pending_id, true), key: 'approve' },
                                        { text: 'Deny', action: t => handleTeacherAction(t.pending_id, false), key: 'deny' }
                                    ])}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">No pending teacher applications</div>
                )}
            </section>

            <section className="teachers-section scrollable">
                {state.teachersData.length > 0 ? (
                    <table className="teachers-table">
                        <thead>
                            <tr>
                                {getCols(state.teachersData).map(col => 
                                    <th key={col}>{formatColName(col)}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {state.teachersData.map((teacher, index) => (
                                <tr key={`teacher-${teacher.user_id || index}`}>
                                    {getCols(state.teachersData).map(col => (
                                        <td key={`${index}-${col}`}>
                                            <EditableField
                                                initialValue={teacher[col] || ''}
                                                onSave={(value) => {
                                                    const tableType = col.startsWith('user_') ? 'users' : 'teachers';
                                                    handleSaveData(tableType, teacher.user_id, col, value);
                                                }}
                                                label={formatColName(col)}
                                                placeholder={`Enter ${formatColName(col).toLowerCase()}`}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">No approved teachers</div>
                )}
            </section>
        </>
    );

    const renderClassesTab = () => {
        const columns = [
            {
                key: 'class_description',
                title: 'Description',
                component: (classData) => (
                    <EditableField
                        initialValue={classData.class_description || 'No description'}
                        onSave={(value) => handleSaveData('classes', classData.class_id, 'class_description', value)}
                        label="Class Description"
                        placeholder="Enter class description"
                    />
                )
            },
            {
                key: 'teacher_id',
                title: 'Teacher',
                component: (classData) => (
                    <EditableDropdown
                        initialValue={classData.teacher_id}
                        onSave={(value) => handleFieldChange('teacher_id')(classData.class_id, value)}
                        label="Teacher"
                        options={state.teachersData.map(teacher => ({
                            value: teacher.user_id,
                            label: teacher.user_name,
                        }))}
                        placeholder="Select a teacher"
                    />
                )
            },
            {
                key: 'course_id',
                title: 'Course',
                component: (classData) => (
                    <EditableDropdown
                        initialValue={classData.course_id}
                        onSave={(value) => handleFieldChange('course_id')(classData.class_id, value)}
                        label="Course"
                        options={state.courseData.map(course => ({
                            value: course.course_id,
                            label: course.course_name,
                        }))}
                        placeholder="Select a course"
                    />
                )
            },
            {
                key: 'grade_id',
                title: 'Grade',
                component: (classData) => (
                    <EditableDropdown
                        initialValue={classData.grade_id}
                        onSave={(value) => handleFieldChange('grade_id')(classData.class_id, value)}
                        label="Grade"
                        options={state.gradesData.map(grade => ({
                            value: grade.grade_id,
                            label: grade.grade_name,
                        }))}
                        placeholder="Select a grade"
                    />
                )
            },
            {
                key: 'schedule',
                title: 'Schedule',
                component: (classData) => (
                    <EditableTimeSchedule
                        initialStartTime={classData.start_time}
                        initialEndTime={classData.end_time}
                        onSave={(startTime, endTime) => handleScheduleChange(classData.class_id, startTime, endTime)}
                        label="Schedule"
                    />
                )
            }
        ];

        return (
            <section className="classes-section scrollable">
                <h3 className="headers">Approved Classes</h3>
                {state.classesData.length > 0 ? (
                    <table className="classes-table">
                        <thead>
                            <tr>
                                {columns.map(col => <th key={col.key}>{col.title}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {state.classesData.map(classData => (
                                <tr key={`class-${classData.class_id}`}>
                                    {columns.map(col => (
                                        <td key={`${classData.class_id}-${col.key}`}>
                                            {col.component(classData)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">No classes available</div>
                )}
            </section>
        );
    };

    const renderStudentsTab = () => (
        <section className="students-section scrollable">
            <h3 className="headers">Queued Students</h3>
            {state.studentsQueued.length > 0 ? (
                <table className="students-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Payment Proof</th>
                            <th>Class</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {state.studentsQueued.map((student, index) => (
                            <tr key={`student-${student.pending_id || index}`}>
                                <td>{getUserName(student.user_id)}</td>
                                <td>
                                    <img 
                                        src={student.screenshot_path} 
                                        alt="payment proof" 
                                        className="payment-proof-img" 
                                    />
                                </td>
                                <td>{getClassName(student.class_id)}</td>
                                {renderActionButtons(student, 'student', [
                                    { 
                                        text: 'Approve', 
                                        action: s => handleStudentQueueApproval(s.class_id, s.user_id, s.pending_id), 
                                        key: 'approve' 
                                    },
                                    { 
                                        text: 'Deny', 
                                        action: s => handleStudentQueueRejection(s.pending_id), 
                                        key: 'reject' 
                                    }
                                ])}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="empty-state">No students in queue</div>
            )}

            <h3 className="headers">All Students</h3>
            {state.studentsData.length > 0 ? (
                <table className="students-table">
                    <thead>
                        <tr>
                            {getCols(state.studentsData).map(col => 
                                <th key={col}>{formatColName(col)}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {state.studentsData.map((student, index) => (
                            <tr key={`student-${student.user_id || index}`}>
                                {getCols(state.studentsData).map(col => {
                                    if (col === 'user_id') {
                                        return <td key={`${index}-${col}`}>{student[col]}</td>;
                                    }
                                    
                                    if (col === 'date_of_birth') {
                                        return (
                                            <td key={`${index}-${col}`}>
                                                <EditableDate
                                                    initialDate={student[col]?.split('T')[0] || ''}
                                                    onSave={(value) => 
                                                        handleSaveData('students', student.user_id, col, 
                                                            value + student[col].split('T')[1])
                                                    }
                                                    label={formatColName(col)}
                                                />
                                            </td>
                                        );
                                    }
                                    
                                    return (
                                        <td key={`${index}-${col}`}>
                                            <EditableField
                                                initialValue={student[col] || ''}
                                                onSave={(value) => handleSaveData('students', student.user_id, col, value)}
                                                label={formatColName(col)}
                                                placeholder={`Enter ${formatColName(col).toLowerCase()}`}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="empty-state">No students registered</div>
            )}
        </section>
    );

    // Loading and error states
    if (state.isLoading) {
        const tabName = ['teachers', 'classes', 'students'][activeTab];
        return <div className="loading-spinner">Loading {tabName} data...</div>;
    }

    if (state.error) {
        return (
            <div className="error-message">
                {state.error}
                <button onClick={() => updateState({ isLoading: true })}>Retry</button>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <nav className="navigation">
                {Object.entries(TABS).map(([name, value]) => (
                    <span
                        key={name}
                        onClick={() => setActiveTab(value)}
                        className={activeTab === value ? 'active' : ''}
                    >
                        {name.charAt(0) + name.slice(1).toLowerCase()}
                    </span>
                ))}
            </nav>

            <div className="tab-content">
                {activeTab === TABS.TEACHERS && renderTeachersTab()}
                {activeTab === TABS.CLASSES && renderClassesTab()}
                {activeTab === TABS.STUDENTS && renderStudentsTab()}
            </div>
        </div>
    );
}
