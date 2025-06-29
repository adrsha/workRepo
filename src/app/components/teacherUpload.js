
// Updated TeachersTab.js
import { teachersFieldMappings, pendingTeachersFieldMappings } from './common/tabFieldMappings';
import { createActionButtons } from './common/Table/utils.js';

const PendingTeachersTable = ({ 
    pendingTeachers, 
    actionInProgress, 
    onTeacherAction,
    onSaveData,
    schemas = {}
}) => {
    const dependencies = { schemas };
    const handlers = { onSaveData };
    const renderCell = createFieldRenderer(pendingTeachersFieldMappings, dependencies, handlers);

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
            renderCell={renderCell}
            hiddenColumns={["expires_at"]}
            additionalColumns={additionalColumns}
            emptyMessage="No pending teacher applications"
        />
    );
};

const ApprovedTeachersTable = ({ 
    teachers, 
    onSaveData, 
    onAddTeacher, 
    onDeleteTeacher, 
    onBulkAddTeachers,
    schemas = {}
}) => {
    const dependencies = { schemas };
    const handlers = { onSaveData };
    const renderCell = createFieldRenderer(teachersFieldMappings, dependencies, handlers);

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
            createFieldRenderer={renderCell}
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
                    onSaveData={handleSaveData}
                    schemas={schemas}
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
