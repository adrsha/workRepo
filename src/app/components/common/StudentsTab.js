import { Section } from './Table/Section.js';
import { EditableField } from '../EditableField';
import { EditableDate } from '../EditableDate';
import { Table } from './Table/index.js';
import { createActionButtons } from './Table/utils.js';
import { formatColName } from '../../lib/utils';
import { useState } from 'react';

import FullScreenableImage from '../FullScreenableImage.js';

// EnrolledClassesCell Component - similar to EnrolledStudentsCell but for classes
const EnrolledClassesCell = ({ userId, enrolledCount, enrolledClasses }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggle = () => {
        setIsExpanded(!isExpanded);
    };

    const handleClassClick = (classId, e) => {
        e.stopPropagation(); // Prevent triggering the expand/collapse
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

// Utility function to calculate class count for each student
const getClassCountForStudent = (userId, classesUsersData) => {
    return classesUsersData.filter(relation => relation.user_id === userId).length;
};

// Utility function to get enrolled classes for a student with their details
const getEnrolledClassesForStudent = (userId, classesUsersData, classesData, courseData, teachersData) => {
    const userClassRelations = classesUsersData.filter(relation => relation.user_id === userId);
    return userClassRelations.map(relation => {
        const classItem = classesData.find(cls => cls.class_id === relation.class_id);
        const course = courseData.find(course => course.course_id === classItem?.course_id);
        const teacher = teachersData.find(teacher => teacher.user_id === classItem?.teacher_id);
        
        return {
            class_id: relation.class_id,
            class_name: classItem?.class_name || classItem?.course_id || 'Unknown Class',
            course_name: course?.course_name || '',
            teacher_name: teacher?.user_name || '',
            ...classItem
        };
    }).filter(classItem => classItem.class_name !== 'Unknown Class');
};

// Complete the enrichStudentsWithClassesData function
function enrichStudentsWithClassesData(state) {
    const { classesUsersData, classesData, courseData, teachersData, studentsData } = state;
    
    return studentsData.map(student => ({
        ...student,
        enrolled_classes: getClassCountForStudent(student.user_id, classesUsersData),
        enrolled_classes_list: getEnrolledClassesForStudent(
            student.user_id, 
            classesUsersData, 
            classesData, 
            courseData, 
            teachersData
        )
    }));
}

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

    if (col === 'enrolled_classes') {
        return (
            <EnrolledClassesCell
                userId={student.user_id}
                enrolledCount={student.enrolled_classes || 0}
                enrolledClasses={student.enrolled_classes_list || []}
            />
        );
    }

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
            hiddenColumns={['enrolled_classes_list']}
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
}) => {
    const enrichedStudentsData = enrichStudentsWithClassesData(state);
    console.log(state)
    return <>
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
                    studentsData={enrichedStudentsData} // Use enriched data
                    onSaveData={handleSaveData}
                    onAddStudent={handleAddStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onBulkAddStudents={handleBulkAddStudents}
                    actionInProgress={actionInProgress}
                    schemas={schemas}
                />
            </Section>
        </Section>
    </>
};
