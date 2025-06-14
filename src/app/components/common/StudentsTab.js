import { Section } from './Table/Section.js';
import { EditableField } from '../EditableField';
import { EditableDate } from '../EditableDate';
import { Table } from './Table/index.js';
import { createActionButtons } from './Table/utils.js';
import { formatColName } from '../../lib/utils';

import FullScreenableImage from '../FullScreenableImage.js';

const QueuedStudentsTable = ({ 
    studentsQueued, 
    actionInProgress,
    onStudentQueueApproval,
    onStudentQueueRejection,
    getUserName,
    getClassName
}) => {
    const actions = [
        { 
            text: 'Approve', 
            action: (student) => onStudentQueueApproval(student.class_id, student.user_id, student.pending_id), 
            key: 'approve' 
        },
        { 
            text: 'Deny', 
            action: (student) => onStudentQueueRejection(student.pending_id), 
            key: 'reject' 
        }
    ];

    const renderActionButtons = createActionButtons(actions, actionInProgress);
    const additionalColumns = [
        {
            key: 'student_name',
            title: 'Student Name',
            render: (student) => {
                return getUserName(student.user_id) || 'Unknown'
            }
        },
        {
            key: 'payment_proof',
            title: 'Payment Proof',
            render: (student) => (
                <FullScreenableImage 
                    src={student.screenshot_path} 
                    alt="payment proof" 
                    className="payment-proof-img" 
                />
            )
        },
        {
            key: 'class_name',
            title: 'Class',
            render: (student) => getClassName(student.class_id) || 'Unknown'
        },
        {
            key: 'actions',
            title: 'Actions',
            render: (student) => renderActionButtons(student, 'student')
        }
    ];

    return (
        <Table
            data={studentsQueued}
            className="students-table"
            keyField="pending_id"
            additionalColumns={additionalColumns}
            emptyMessage="No students in queue"
        />
    );
};

const createCellRenderer = (schemas, onSaveData) => (student, col) => {
    if (col === 'user_id') return student[col];
    
    if (col === 'date_of_birth') {
        return (
            <EditableDate
                initialDate={student[col]?.split('T')[0] || ''}
                onSave={(value) => {
                    const tableName = getTableForColumn(schemas, col);
                    const dateValue = value + (student[col]?.split('T')[1] || 'T00:00:00');
                    onSaveData(tableName, student.user_id, col, dateValue);
                }}
                label={formatColName(col)}
            />
        );
    }
    
    return (
        <EditableField
            initialValue={student[col] || ''}
            onSave={(value) => {
                const tableName = getTableForColumn(schemas, col);
                onSaveData(tableName, student.user_id, col, value);
            }}
            label={formatColName(col)}
            placeholder={`Enter ${formatColName(col).toLowerCase()}`}
        />
    );
};

const getTableForColumn = (schemas, column) => {
    for (const [tableName, schema] of Object.entries(schemas)) {
        if (schema.columns.includes(column)) {
            return tableName;
        }
    }
    return 'students'; // fallback
};

const createAsyncHandler = (fn, errorMessage) => async (...args) => {
    try {
        await fn(...args);
    } catch (error) {
        alert(`${errorMessage}: ${error.message}`);
        throw error;
    }
};

const createConfirmHandler = (fn, message) => async (...args) => {
    if (window.confirm(message)) {
        await fn(...args);
    }
};

const AllStudentsTable = ({ 
    studentsData, 
    onSaveData,
    onAddStudent,
    onDeleteStudent,
    onBulkAddStudents,
    actionInProgress,
    schemas
}) => {
    const handleDelete = createConfirmHandler(
        createAsyncHandler(onDeleteStudent, 'Error deleting student'),
        'Are you sure you want to delete this student?'
    );

    const handleAdd = createAsyncHandler(onAddStudent, 'Error adding student');
    const handleBulkAdd = createAsyncHandler(onBulkAddStudents, 'Error bulk adding students');
    const renderCell = createCellRenderer(schemas, onSaveData);

    return (
        <Table
            data={studentsData}
            className="students-table"
            keyField="user_id"
            renderCell={renderCell}
            emptyMessage="No students registered"
            allowAdd={true}
            allowDelete={true}
            allowBulkAdd={true}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onBulkAdd={handleBulkAdd}
            requiredFields={['user_id']}
            tableName="Student"
        />
    );
};

export const StudentsTab = ({ 
    state, 
    actionInProgress,
    handleSaveData,
    handleStudentQueueApproval,
    handleStudentQueueRejection,
    handleAddStudent,
    handleDeleteStudent,
    handleBulkAddStudents,
    getUserName,
    getClassName,
    schemas = {}
}) => (
    <Section className="students-section scrollable">
        <Section title="Queued Students">
            <QueuedStudentsTable
                studentsQueued={state.studentsQueued}
                actionInProgress={actionInProgress}
                onStudentQueueApproval={handleStudentQueueApproval}
                onStudentQueueRejection={handleStudentQueueRejection}
                getUserName={getUserName}
                getClassName={getClassName}
            />
        </Section>

        <Section title="All Students">
            <AllStudentsTable
                studentsData={state.studentsData}
                onSaveData={handleSaveData}
                onAddStudent={handleAddStudent}
                onDeleteStudent={handleDeleteStudent}
                onBulkAddStudents={handleBulkAddStudents}
                actionInProgress={actionInProgress}
                schemas={schemas}
            />
        </Section>
    </Section>
);
