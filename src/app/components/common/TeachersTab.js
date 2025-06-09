import { Section } from './Table/Section.js';
import { EditableField } from '../EditableField';
import { EditableDate } from '../EditableDate.js';
import { createActionButtons } from './Table/utils.js';
import { Table } from './Table/index.js';
import { formatColName } from '../../lib/utils';

const PendingTeachersTable = ({ 
    pendingTeachers, 
    actionInProgress, 
    onTeacherAction 
}) => {
    const actions = [
        { text: 'Approve', action: (teacher) => onTeacherAction(teacher.pending_id, true), key: 'approve' },
        { text: 'Deny', action: (teacher) => onTeacherAction(teacher.pending_id, false), key: 'deny' }
    ];

    const renderActionButtons = createActionButtons(actions, actionInProgress);

    const additionalColumns = [{
        key: 'actions',
        title: 'Actions',
        render: (teacher) => renderActionButtons(teacher, 'teacher')
    }];

    return (
        <Table
            data={pendingTeachers}
            className="teachers-table"
            keyField="pending_id"
            additionalColumns={additionalColumns}
            emptyMessage="No pending teacher applications"
        />
    );
};

const getTableForColumn = (schemas, column) => {
    for (const [tableName, schema] of Object.entries(schemas)) {
        if (schema.columns.includes(column)) {
            return tableName;
        }
    }
    return 'teachers'; 
};

const createFieldRenderer = (schemas, onSaveData) => {
    const handleSave = (col, teacherId) => (value) => {
        const tableName = getTableForColumn(schemas, col);
        onSaveData(tableName, teacherId, col, value);
    };

    return (teacher, col) => {
        const saveHandler = handleSave(col, teacher.user_id);
        const fieldMap = {
            experience: () => (
                <EditableField
                    initialValue={teacher.experience || 'No experience listed'}
                    onSave={saveHandler}
                    placeholder="Enter teaching experience"
                    label={formatColName(col)}
                />
            ),
            qualification: () => (
                <EditableField
                    initialValue={teacher.qualification || 'No qualification listed'}
                    onSave={saveHandler}
                    placeholder="Enter qualifications"
                    label={formatColName(col)}
                />
            ),
            user_level: () => (
                <EditableField
                    initialValue={teacher.user_level || 'Not set'}
                    onSave={saveHandler}
                    placeholder="Enter user level"
                    label={formatColName(col)}
                />
            ),
            created_at: () => (
                <EditableDate
                    initialDate={teacher.created_at.split('T')[0] || 'Not set'}
                    onSave={saveHandler}
                    label={formatColName(col)}
                />
            )
        };

        const renderField = fieldMap[col];
        if (renderField) return renderField();

        return (
            <EditableField
                initialValue={teacher[col] || ''}
                onSave={saveHandler}
                label={formatColName(col)}
                placeholder={`Enter ${formatColName(col).toLowerCase()}`}
            />
        );
    };
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

const ApprovedTeachersTable = ({ 
    teachers, 
    onSaveData, 
    onAddTeacher, 
    onDeleteTeacher, 
    onBulkAddTeachers,
    schemas = {}
}) => {
    const renderCell = createFieldRenderer(schemas, onSaveData);
    
    const handleDelete = createConfirmHandler(
        createAsyncHandler(onDeleteTeacher, 'Error deleting teacher'),
        'Are you sure you want to delete this teacher?'
    );

    const handleAdd = createAsyncHandler(onAddTeacher, 'Error adding teacher');
    const handleBulkAdd = createAsyncHandler(onBulkAddTeachers, 'Error bulk adding teachers');

    return (
        <Table
            data={teachers}
            className="teachers-table"
            keyField="user_id"
            renderCell={renderCell}
            emptyMessage="No approved teachers"
            allowAdd={true}
            allowDelete={true}
            allowBulkAdd={true}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onBulkAdd={handleBulkAdd}
            requiredFields={['user_id']}
            tableName="Teacher"
        />
    );
};

export const TeachersTab = ({ 
    state, 
    actionInProgress, 
    handleTeacherAction, 
    handleSaveData,
    handleAddTeacher,
    handleDeleteTeacher,
    handleBulkAddTeachers,
    schemas = {}
}) => (
    <>
        <Section title="Pending Teachers" className="teachers-section">
            <PendingTeachersTable
                pendingTeachers={state.pendingTeachersData}
                actionInProgress={actionInProgress}
                onTeacherAction={handleTeacherAction}
            />
        </Section>

        <Section title="Approved Teachers" className="teachers-section scrollable">
            <ApprovedTeachersTable
                teachers={state.teachersData}
                onSaveData={handleSaveData}
                onAddTeacher={handleAddTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                onBulkAddTeachers={handleBulkAddTeachers}
                schemas={schemas}
            />
        </Section>
    </>
);
