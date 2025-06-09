// AdminControl.jsx
'use client';
import './innerStyles/AdminControl.css';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAdminData } from '../../hooks/useAdminData';
import { usePersistedTab, useAsyncAction, useAdminLookups } from '../../hooks/useAdminHooks';
import { createActionHandlers } from '../lib/adminActions';
import { TeachersTab } from './common/TeachersTab';
import { ClassesTab } from './common/ClassesTab';
import { StudentsTab } from './common/StudentsTab';
import { TABS } from '../lib/utils';
import { getSchema } from '../lib/schema';

const TAB_NAMES = ['teachers', 'classes', 'students'];
const TAB_ENTRIES = Object.entries(TABS);

const LoadingSpinner = ({ tabIndex }) => (
    <div className="loading-spinner">Loading {TAB_NAMES[tabIndex]} data...</div>
);

const ErrorMessage = ({ error, onRetry }) => (
    <div className="error-message">
        {error}
        <button onClick={onRetry}>Retry</button>
    </div>
);

const Navigation = ({ activeTab, onTabChange }) => (
    <nav className="navigation">
        {TAB_ENTRIES.map(([name, value]) => (
            <span
                key={name}
                onClick={() => onTabChange(value)}
                className={activeTab === value ? 'active' : ''}
            >
                {name.charAt(0) + name.slice(1).toLowerCase()}
            </span>
        ))}
    </nav>
);

const TabContent = ({ activeTab, props }) => {
    const tabs = {
        [TABS.TEACHERS]: <TeachersTab {...props.teachers} />,
        [TABS.CLASSES]: <ClassesTab {...props.classes} />,
        [TABS.STUDENTS]: <StudentsTab {...props.students} />
    };
    
    return <div className="table-content">{tabs[activeTab]}</div>;
};

export default function AdminControl({ pendingTeachersData = [] }) {
    const [activeTab, setActiveTab] = usePersistedTab();
    const { actionInProgress, startAction, endAction } = useAsyncAction();
    const { data: session, update } = useSession();
    
    const {
        state,
        updateState,
        updateArrayState,
        loadInitialData,
        loadTabData,
        resetData
    } = useAdminData(pendingTeachersData);
    const { getUserName, getClassName } = useAdminLookups(state);
    
    const actionHandlers = createActionHandlers(
        { updateArrayState, updateState },
        { startAction, endAction },
        session,
        update
    );

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        loadTabData(activeTab);
    }, [activeTab, loadTabData]);

    const handleRetry = () => {
        resetData();
        loadTabData(activeTab);
    };

    if (state.isLoading) {
        return <LoadingSpinner tabIndex={activeTab} />;
    }

    if (state.error) {
        return <ErrorMessage error={state.error} onRetry={handleRetry} />;
    }

    const tabProps = {
        teachers: {
            state,
            actionInProgress,
            handleTeacherAction: actionHandlers.handleTeacherAction,
            handleSaveData: actionHandlers.handleSaveData,
            handleAddTeacher: actionHandlers.handleAddTeacher,
            handleDeleteTeacher: actionHandlers.handleDeleteTeacher,
            handleBulkAddTeachers: actionHandlers.handleBulkAddTeachers,
            schemas: getSchema()
        },
        classes: {
            state,
            actionInProgress,
            handleSaveData: actionHandlers.handleSaveData,
            handleMultiSaveData: actionHandlers.handleMultiSaveData,
            handleAddClass: actionHandlers.handleAddClass,
            handleDeleteClass: actionHandlers.handleDeleteClass,
            handleBulkAddClasses: actionHandlers.handleBulkAddClasses,
            schemas: getSchema()
        },
        students: {
            state,
            actionInProgress,
            getUserName,
            getClassName,
            handleStudentQueueApproval: actionHandlers.handleStudentQueueApproval,
            handleStudentQueueRejection: actionHandlers.handleStudentQueueRejection,
            handleSaveData: actionHandlers.handleSaveData,
            handleAddStudent: actionHandlers.handleAddStudent,
            handleDeleteStudent: actionHandlers.handleDeleteStudent,
            handleBulkAddStudents: actionHandlers.handleBulkAddStudents,
            schemas: getSchema()
        }
    };

    return (
        <div className="admin-panel">
            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
            <TabContent activeTab={activeTab} props={tabProps} />
        </div>
    );
}
