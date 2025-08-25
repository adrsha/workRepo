import { Section } from './Table/Section.js';
import { Table } from './Table/index.js';
import { createFieldRenderer, createOptions } from './fieldRendererFactory.js';
import { studentsFieldMappings } from './tabFieldMappings.js';
import { createActionButtons } from './Table/utils.js';
import { useState } from 'react';
import FullScreenableImage from '../FullScreenableImage.js';

const EnrolledClassesCell = ({ userId, enrolledCount, enrolledClasses }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggle = () => {
        setIsExpanded(!isExpanded);
    };

    const handleClassClick = (classId, e) => {
        e.stopPropagation();
        window.open(`/classes/${classId}`, '_blank');
    };

    return (
        <div className="enrolled-classes-container">
            <div
                className="enrolled-classes-count clickable"
                onClick={handleToggle}
                title="Click to view enrolled classes"
            >
                <span className="class-count-badge">
                    {enrolledCount} class{enrolledCount !== 1 ? 'es' : ''}
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                        {isExpanded ? '▼' : '▶'}
                    </span>
                </span>
            </div>

            {isExpanded && (
                <div className="enrolled-classes-list">
                    {enrolledClasses.length > 0 ? (
                        <div className="classes-grid">
                            {enrolledClasses.map((classItem) => (
                                <div
                                    key={classItem.class_id}
                                    className="class-item"
                                    onClick={(e) => handleClassClick(classItem.class_id, e)}
                                    title={`Click to view ${classItem.class_name}'s details`}
                                >
                                    <div className="class-name">{classItem.class_name}</div>
                                    {classItem.course_name && (
                                        <div className="class-course">{classItem.course_name}</div>
                                    )}
                                    {classItem.teacher_name && (
                                        <div className="class-teacher">Teacher: {classItem.teacher_name}</div>
                                    )}
                                    <div className="class-link-icon">📚</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-classes">No classes enrolled</div>
                    )}
                </div>
            )}
        </div>
    );
};

const getClassCountForStudent = (studentId, classesUsersData) =>
    classesUsersData.filter(relation => relation.user_id === studentId).length;

const getEnrolledClassesForStudent = (studentId, classesUsersData, classesData, teachersData, courseData) => {
    const studentClassRelations = classesUsersData.filter(relation => relation.user_id === studentId);
    return studentClassRelations.map(relation => {
        const classItem = classesData.find(cls => cls.class_id === relation.class_id);
        const teacher = teachersData.find(t => t.user_id === classItem?.teacher_id);
        const course = courseData.find(c => c.course_id === classItem?.course_id);

        return {
            class_id: relation.class_id,
            class_name: classItem?.class_name || '',
            course_name: course?.course_name || '',
            teacher_name: teacher?.user_name || '',
            start_time: classItem?.start_time || '',
            end_time: classItem?.end_time || '',
            ...classItem
        };
    }).filter(classItem => classItem.class_id);
};


// Async handlers
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
            render: (student) => getUserName(student.user_id) || 'Unknown'
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

const ApprovedStudentsTable = ({
    students,
    gradesData,
    rolesData,
    classesUsersData = [],
    classesData = [],
    teachersData = [],
    courseData = [],
    onSaveData,
    onMultiSaveData,
    onAddStudent,
    onDeleteStudent,
    onBulkAddStudents,
    schemas = {}
}) => {
    const enrichedStudents = students;
    const newSchema = {columns : [...schemas.users.columns, ...schemas.students.columns]}
    const dependencies = { gradesData, rolesData, schemas };
    const handlers = { onSaveData, onMultiSaveData };
    const renderCell = createFieldRenderer(studentsFieldMappings, dependencies, handlers);

    // Enhanced renderCell to handle enrolled_classes specially
    const enhancedRenderCell = (student, col) => {
        if (col === 'enrolled_classes') {
            return (
                <EnrolledClassesCell
                    userId={student.user_id}
                    enrolledCount={student.enrolled_classes || 0}
                    enrolledClasses={student.enrolled_classes_list || []}
                />
            );
        }
        return renderCell(student, col);
    };

    const handleDelete = createConfirmHandler(
        createAsyncHandler(onDeleteStudent, 'Error deleting student'),
        'Are you sure you want to delete this student? This may affect enrolled classes.'
    );

    const handleAdd = createAsyncHandler(onAddStudent, 'Error adding student');
    const handleBulkAdd = createAsyncHandler(onBulkAddStudents, 'Error bulk adding students');

    const dropdownOptions = {
        grade_id: createOptions(gradesData, 'grade_id', 'grade_name'),
        role_id: createOptions(rolesData, 'role_id', 'role_name'),
    };

    const additionalColumns = [{
        key: 'student_profile',
        title: 'Profile',
        render: (student) => <a href={`/profile/${student.user_id}`}>View Profile</a>
    }];

    return (
        <Table
            data={enrichedStudents}
            schema={newSchema}
            renderCell={enhancedRenderCell}
            fieldMappings={studentsFieldMappings}
            dependencies={dependencies}
            handlers={handlers}
            className="students-table"
            keyField="user_id"
            createFieldRenderer={enhancedRenderCell}
            dropdownOptions={dropdownOptions}
            additionalColumns={additionalColumns}
            emptyMessage="No students available"
            allowAdd={true}
            allowDelete={true}
            allowBulkAdd={true}
            hiddenColumns={['enrolled_classes_list']}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onBulkAdd={handleBulkAdd}
            requiredFields={['user_name', 'user_email', 'contact', 'date_of_birth']}
            tableName="Student"
        />
    );
};

export const StudentsTab = ({
    state,
    actionInProgress,
    handleSaveData,
    handleMultiSaveData,
    handleAddStudent,
    handleDeleteStudent,
    handleBulkAddStudents,
    handleStudentQueueApproval,
    handleStudentQueueRejection,
    getUserName,
    getClassName,
    schemas = {}
}) => (
    <Section title="Students" className="students-section scrollable">
        {/* Queued Students Section */}
        {state.studentsQueued && state.studentsQueued.length > 0 && (
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
        )}

        <Section title="Approved Students">
                
            <ApprovedStudentsTable
                students={state.studentsData || state.usersData?.filter(user => user.role_name === 'student') || []}
                gradesData={state.gradesData}
                rolesData={state.rolesData}
                classesUsersData={state.classesUsersData}
                classesData={state.classesData}
                teachersData={state.teachersData}
                courseData={state.courseData}
                onSaveData={handleSaveData}
                onMultiSaveData={handleMultiSaveData}
                onAddStudent={handleAddStudent}
                onDeleteStudent={handleDeleteStudent}
                onBulkAddStudents={handleBulkAddStudents}
                schemas={schemas}
            />
        </Section>
    </Section>
);
