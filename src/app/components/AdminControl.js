// AdminControl.jsx
'use client';
import './innerStyles/AdminControl.css';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAdminData } from '../../hooks/useAdminData';
import { usePersistedTab, useAsyncAction, useAdminLookups } from '../../hooks/useAdminHooks';
import { createActionHandlers } from '../lib/adminActions';
import { TeachersTab } from './common/TeachersTab';
import { ClassesTab } from './common/ClassesTab';
import { StudentsTab } from './common/StudentsTab';
import { CoursesTab } from './common/CoursesTab';
import { GradesTab } from './common/GradesTab';
import { PaymentRequestsTab } from './PaymentRequestsTab';
import Loading from './Loading';
import { TABS } from '../lib/utils';
import { getSchema } from '../lib/schema';

const TAB_ENTRIES = Object.entries(TABS);

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
        [TABS.STUDENTS]: <StudentsTab {...props.students} />,
        [TABS.COURSES]:  <CoursesTab {...props.courses} />,
        [TABS.GRADES]:   <GradesTab {...props.grades} />,
        [TABS.PAYMENTS]: <PaymentRequestsTab />
    };

    return <div className="table-content">{tabs[activeTab]}</div>;
};

export default function AdminControl({ pendingTeachersData = [] }) {
    const [activeTab, setActiveTab] = usePersistedTab();
    const { actionInProgress, startAction, endAction } = useAsyncAction();
    const { data: session, update } = useSession();
    const [schemas, setSchemas] = useState({});
    const [schemasLoading, setSchemasLoading] = useState(true);
    const {
        state,
        updateState,
        loadLookupData,
        updateArrayState,
        loadInitialData,
        loadTabData,
        resetData
    } = useAdminData(pendingTeachersData);

    useEffect(() => {
        async function loadSchemas() {
            try {
                setSchemasLoading(true);
                const loadedSchemas = await getSchema();
                setSchemas(loadedSchemas);
            } catch (error) {
                console.error('Failed to load schemas:', error);
            } finally {
                setSchemasLoading(false);
            }
        }

        if (session) {
            loadSchemas();
        }
    }, [session]);

    const { getUserName, getClassName } = useAdminLookups(state, loadLookupData);

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

    // Show loading while either data or schemas are loading
    if (state.isLoading || schemasLoading) {
        return <Loading/>;
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
            handleBulkAddTeachers: actionHandlers.handleBulkAddTeacher,
            schemas,
        },
        classes: {
            state,
            actionInProgress,
            handleSaveData: actionHandlers.handleSaveData,
            handleMultiSaveData: actionHandlers.handleMultiSaveData,
            handleAddClass: actionHandlers.handleAddClass,
            handleDeleteClass: actionHandlers.handleDeleteClass,
            handleBulkAddClasses: actionHandlers.handleBulkAddClass,
            schemas,
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
            handleBulkAddStudents: actionHandlers.handleBulkAddStudent,
            schemas,
        },
        courses: {
            state,
            actionInProgress,
            handleSaveData: actionHandlers.handleSaveData,
            handleAddCourse: actionHandlers.handleAddCourse,
            handleDeleteCourse: actionHandlers.handleDeleteCourse,
            handleBulkAddCourses: actionHandlers.handleBulkAddCourse,
            schemas,
        },
        grades: {
           state,
           actionInProgress,
           handleSaveData:        actionHandlers.handleSaveData,
           handleAddGrade:        actionHandlers.handleAddGrade,
           handleDeleteGrade:     actionHandlers.handleDeleteGrade,
           handleBulkAddGrades:   actionHandlers.handleBulkAddGrade,
           schemas,
        }
    };

    return (
        <div className="admin-panel">
            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
            <TabContent activeTab={activeTab} props={tabProps} />
        </div>
    );
}


// Helper hook for fetching content requests
export const useContentRequests = (session) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const fetchRequests = async (status = 'pending') => {
        if (!session?.user || session.user.level < 1) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/contentRequests?status=${status}`);
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            console.error('Error fetching content requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const processRequest = async (requestId, action, adminNotes = '') => {
        const response = await fetch('/api/contentRequests/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, action, adminNotes })
        });

        if (response.ok) {
            await fetchRequests(); // Refresh
            return true;
        }
        return false;
    };

    return {
        requests,
        loading,
        fetchRequests,
        processRequest
    };
};
