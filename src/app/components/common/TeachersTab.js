import { useState } from 'react';
import { Section } from './Table/Section.js';
import { EditableField } from '../EditableField';
import { EditableDate } from '../EditableDate.js';
import { createActionButtons } from './Table/utils.js';
import { Table } from './Table/index.js';
import { formatColName } from '../../lib/utils';

import FullScreenableImage from '../FullScreenableImage.js';

// Modal component for displaying full text
const TextModal = ({ isOpen, onClose, title, content }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="close-btn" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="modal-body" style={{ textWrap: 'auto' }}>
                    <p>{content}</p>
                </div>
            </div>
        </div>
    );
};

// Component for truncated text with modal popup
const TruncatedText = ({ text, maxLength = 50, title }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!text || text.length <= maxLength) {
        return <span>{text || 'Not provided'}</span>;
    }

    const truncated = text.substring(0, maxLength) + '...';

    return (
        <>
            <span
                className="truncated-text clickable"
                onClick={() => setIsModalOpen(true)}
                title="Click to view full content"
            >
                {truncated}
            </span>
            <TextModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={title}
                content={text}
            />
        </>
    );
};

// Profile link component
const ProfileLink = ({ teacherId, isPending = false }) => {
    if (!teacherId) return <span>No ID</span>;

    const handleClick = () => {
        window.open(`/profile/${teacherId}`, '_blank');
    };

    return (
        <button
            onClick={handleClick}
            className="profile-link-btn"
            title={`View ${isPending ? 'pending ' : ''}teacher profile`}
        >
            View Profile
        </button>
    );
};

const PendingTeachersTable = ({
    pendingTeachers,
    actionInProgress,
    onTeacherAction,
    onSaveData,
    schemas = {}
}) => {
    const actions = [
        { text: 'Approve', action: (teacher) => onTeacherAction(teacher.pending_id, true), key: 'approve' },
        { text: 'Deny', action: (teacher) => onTeacherAction(teacher.pending_id, false), key: 'deny' }
    ];

    const renderActionButtons = createActionButtons(actions, actionInProgress);

    // Create field renderer for pending teachers with restricted editing
    const renderPendingCell = (teacher, col) => {
        const saveHandler = (value) => {
            onSaveData('pending_teachers', teacher.pending_id, col, value);
        };

        // Only allow editing of user_name, user_email, and contact
        const editableFields = ['user_name', 'user_email', 'contact'];

        if (editableFields.includes(col)) {
            return (
                <EditableField
                    initialValue={teacher[col] || ''}
                    onSave={saveHandler}
                    label={formatColName(col)}
                    placeholder={`Enter ${formatColName(col).toLowerCase()}`}
                />
            );
        }

        // Special handling for qualification and experience - show truncated with modal
        if (col === 'qualification') {
            return (
                <TruncatedText
                    text={teacher.qualification}
                    title="Qualification Details"
                />
            );
        }

        if (col === 'experience') {
            return (
                <TruncatedText
                    text={teacher.experience}
                    title="Experience Details"
                />
            );
        }

        // Certificate image
        if (col === 'certificate_path') {
            return (
                <FullScreenableImage
                    src={teacher.certificate_path}
                    alt="certificate"
                    className="certificate-img"
                />
            );
        }
        
        if (col === 'cv_path') {
            return (
                <FullScreenableImage
                    src={teacher.cv_path}
                    alt="cv"
                    className="cv-img"
                />
            );
        }
        
        // Special handling for secret_key - highlight it
        if (col === 'secret_key') {
            return (
                <span className="secret-key-highlight">
                    {teacher.secret_key || 'Not generated'}
                </span>
            );
        }

        // For other fields, just display the value
        return <span>{teacher[col] || 'Not provided'}</span>;
    };

    const additionalColumns = [
        {
            key: 'profile',
            title: 'Profile',
            render: (teacher) => (
                <ProfileLink
                    teacherId={teacher.user_id || teacher.pending_id}
                    isPending={true}
                />
            )
        },
        {
            key: 'actions',
            title: 'Actions',
            render: (teacher) => renderActionButtons(teacher, 'teacher')
        }
    ];

    return (
        <Table
            data={pendingTeachers}
            schema={schemas.pending_teachers}
            className="teachers-table"
            keyField="pending_id"
            renderCell={renderPendingCell}
            hiddenColumns={["expires_at"]}
            additionalColumns={additionalColumns}
            emptyMessage="No pending teacher applications"
        />
    );
};

const getTableForColumn = (data, column) => {
    // Check in config object
    if (data.config && data.config.hasOwnProperty(column)) {
        return 'config';
    }

    // Check in sections array
    if (data.sections && data.sections.length > 0) {
        if (data.sections[0].hasOwnProperty(column)) {
            return 'sections';
        }
        // Check in links within sections
        if (data.sections[0].links && data.sections[0].links.length > 0) {
            if (data.sections[0].links[0].hasOwnProperty(column)) {
                return 'links';
            }
        }
    }

    // Check in socialLinks array
    if (data.socialLinks && data.socialLinks.length > 0) {
        if (data.socialLinks[0].hasOwnProperty(column)) {
            return 'socialLinks';
        }
    }

    // Default fallback
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
            cv_path: () => (
                teacher.certificate_path ?
                    <FullScreenableImage
                        src={teacher.cv_path}
                        alt="cv"
                        className="cv-img"
                    /> :
                    <EditableField
                        initialValue={teacher.cv_path || ''}
                        onSave={teacher.user_id ? saveHandler : () => { }}
                        placeholder="Enter cv path"
                        label={formatColName(col)}
                    />
            ),
            certificate_path: () => (
                teacher.certificate_path ?
                    <FullScreenableImage
                        src={teacher.certificate_path}
                        alt="certificate"
                        className="certificate-img"
                    /> :
                    <EditableField
                        initialValue={teacher.certificate_path || ''}
                        onSave={teacher.user_id ? saveHandler : () => { }}
                        placeholder="Enter certificate path"
                        label={formatColName(col)}
                    />
            ),
            experience: () => (
                <EditableField
                    initialValue={teacher.experience || ''}
                    onSave={teacher.user_id ? saveHandler : () => { }}
                    placeholder="Enter teaching experience"
                    label={formatColName(col)}
                />
            ),
            qualification: () => (
                <EditableField
                    initialValue={teacher.qualification || ''}
                    onSave={teacher.user_id ? saveHandler : () => { }}
                    placeholder="Enter qualifications"
                    label={formatColName(col)}
                />
            ),
            user_level: () => (
                <EditableField
                    initialValue={teacher.user_level || ''}
                    onSave={teacher.user_id ? saveHandler : () => { }}
                    placeholder="Enter user level"
                    label={formatColName(col)}
                />
            ),
            created_at: () => (
                <EditableDate
                    initialDate={teacher.created_at.split('T')[0] || ''}
                    onSave={teacher.user_id ? saveHandler : () => { }}
                    label={formatColName(col)}
                />
            )
        };

        const renderField = fieldMap[col];
        if (renderField) return renderField();

        return (
            <EditableField
                initialValue={teacher[col] || ''}
                onSave={teacher.user_id ? saveHandler : () => { }}
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

    const newSchema = {columns : [...schemas.users.columns, ...schemas.teachers.columns]}
    const handleDelete = createConfirmHandler(
        createAsyncHandler(onDeleteTeacher, 'Error deleting teacher'),
        'Are you sure you want to delete this teacher?'
    );

    const handleAdd = createAsyncHandler(onAddTeacher, 'Error adding teacher');
    const handleBulkAdd = createAsyncHandler(onBulkAddTeachers, 'Error bulk adding teachers');

    const additionalColumns = [{
        key: 'profile',
        title: 'Profile',
        render: (teacher) => (
            <ProfileLink
                teacherId={teacher.user_id}
                isPending={false}
            />
        )
    }];

    return (
        <Table
            data={teachers}
            schema={newSchema}
            className="teachers-table"
            keyField="user_id"
            renderCell={renderCell}
            createFieldRenderer={renderCell} // Pass the field renderer to the table
            emptyMessage="No approved teachers"
            allowAdd={true}
            allowDelete={true}
            allowBulkAdd={true}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onBulkAdd={handleBulkAdd}
            requiredFields={['user_id']}
            tableName="Teacher"
            additionalColumns={additionalColumns}
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
