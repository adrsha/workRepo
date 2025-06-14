import { Section } from './Table/Section.js';
import { EditableField } from '../EditableField';
import { EditableDate } from '../EditableDate';
import { Table } from './Table/index.js';
import { createActionButtons } from './Table/utils.js';
import { formatColName } from '../../lib/utils';
import { useState } from 'react';

import FullScreenableImage from '../FullScreenableImage.js';

const EnrolledClassesCell = ({ userId, enrolledCount, enrolledClasses }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggle = () => {
        setIsExpanded(!isExpanded);
    };

    const handleClassClick = (classId, e) => {
        e.stopPropagation(); // Prevent triggering the expand/collapse
        console.log(`Navigate to class ${classId}`);
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
                            {enrolledClasses.map((classInfo) => (
                                <div
                                    key={classInfo.class_id}
                                    className="class-item"
                                    onClick={(e) => handleClassClick(classInfo.class_id, e)}
                                    title={`Click to view class details`}
                                >
                                    <div className="class-name">{classInfo.class_name || `Class ${classInfo.class_id}`}</div>
                                    {classInfo.course_name && (
                                        <div className="course-name">{classInfo.course_name}</div>
                                    )}
                                    {classInfo.teacher_name && (
                                        <div className="teacher-name">Teacher: {classInfo.teacher_name}</div>
                                    )}
                                    {classInfo.start_time && (
                                        <div className="class-time">
                                            {new Date(classInfo.start_time).toLocaleString()}
                                        </div>
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
                console.log("Student user id", student.user_id)
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

// FIXED: Utility function to calculate class count for each student
const getClassCountForStudent = (userId, classesUsersData) => {
    if (!classesUsersData || !Array.isArray(classesUsersData)) {
        console.log('classesUsersData is not available or not an array:', classesUsersData);
        return 0;
    }
    
    console.log(`Calculating class count for user ${userId}:`, classesUsersData);
    const count = classesUsersData.filter(relation => 
        relation.user_id === userId || relation.user_id === parseInt(userId)
    ).length;
    
    console.log(`User ${userId} has ${count} classes`);
    return count;
};

// FIXED: Utility function to get enrolled classes for a student with their details
const getEnrolledClassesForStudent = (userId, classesUsersData, classesData, courseData, teachersData, usersData) => {
    if (!classesUsersData || !Array.isArray(classesUsersData)) {
        console.log('classesUsersData not available for enrolled classes');
        return [];
    }

    console.log(`Getting enrolled classes for user ${userId}`);
    console.log('Available data:', {
        classesUsersData: classesUsersData.length,
        classesData: classesData?.length,
        courseData: courseData?.length,
        teachersData: teachersData?.length,
        usersData: usersData?.length
    });

    // Find all class relations for this student
    const studentClassRelations = classesUsersData.filter(relation => 
        relation.user_id === userId || relation.user_id === parseInt(userId)
    );
    
    console.log(`Found ${studentClassRelations.length} class relations for user ${userId}:`, studentClassRelations);

    const enrichedClasses = studentClassRelations.map(relation => {
        const classInfo = classesData?.find(cls => 
            cls.class_id === relation.class_id || cls.class_id === parseInt(relation.class_id)
        );
        
        const course = courseData?.find(course => 
            course.course_id === classInfo?.course_id || course.course_id === parseInt(classInfo?.course_id)
        );
        
        const teacher = usersData?.find(user => 
            user.user_id === classInfo?.teacher_id || user.user_id === parseInt(classInfo?.teacher_id)
        ) || teachersData?.find(teacher => 
            teacher.user_id === classInfo?.teacher_id || teacher.user_id === parseInt(classInfo?.teacher_id)
        );
        
        console.log(`Enriching class ${relation.class_id}:`, {
            classInfo: classInfo ? 'found' : 'not found',
            course: course ? course.course_name : 'not found',
            teacher: teacher ? teacher.user_name || teacher.name : 'not found'
        });
        
        return {
            class_id: relation.class_id,
            class_name: classInfo?.class_name || classInfo?.name || `Class ${relation.class_id}`,
            course_name: course?.course_name || course?.name || '',
            teacher_name: teacher?.user_name || teacher?.name || '',
            start_time: classInfo?.start_time || '',
            end_time: classInfo?.end_time || '',
            cost: classInfo?.cost || '',
            ...classInfo
        };
    });

    console.log(`Returning ${enrichedClasses.length} enriched classes for user ${userId}:`, enrichedClasses);
    return enrichedClasses;
};

// FIXED: Utility function to enrich students data with class counts and class lists
const enrichStudentsWithClassCount = (studentsData, classesUsersData, classesData = [], courseData = [], teachersData = [], usersData = []) => {
    console.log('Enriching students with class count. Data available:', {
        studentsData: studentsData?.length || 0,
        classesUsersData: classesUsersData?.length || 0,
        classesData: classesData?.length || 0,
        courseData: courseData?.length || 0,
        teachersData: teachersData?.length || 0,
        usersData: usersData?.length || 0
    });

    if (!studentsData || !Array.isArray(studentsData)) {
        console.log('No students data available');
        return [];
    }

    return studentsData.map(student => {
        const enrolledCount = getClassCountForStudent(student.user_id, classesUsersData);
        const enrolledClassesList = getEnrolledClassesForStudent(
            student.user_id, 
            classesUsersData, 
            classesData, 
            courseData, 
            teachersData, 
            usersData
        );

        console.log(`Student ${student.user_id} (${student.user_name || student.name}) has ${enrolledCount} classes`);

        return {
            ...student,
            enrolled_classes: enrolledCount,
            enrolledClassesList: enrolledClassesList
        };
    });
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

    // Handle enrolled_classes column
    if (col === 'enrolled_classes') {
        return (
            <EnrolledClassesCell 
                userId={student.user_id}
                enrolledCount={student.enrolled_classes || 0}
                enrolledClasses={student.enrolledClassesList || []}
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

const createFormFieldRenderer = () => {
    return (field, value, onChange, { error }) => {
        const onSave = (newValue) => onChange(field, newValue);
        const fieldWithError = { [field]: value, className: error ? 'error' : '' };

        // Don't render enrolled_classes in forms since it's calculated
        if (field === 'enrolled_classes') {
            return null;
        }

        if (field === 'date_of_birth') {
            return (
                <EditableDate
                    initialDate={fieldWithError[field]?.split('T')[0] || ''}
                    onSave={onSave}
                    label={formatColName(field)}
                    isFormMode={true}
                />
            );
        }

        return (
            <EditableField
                initialValue={fieldWithError[field]}
                onSave={onSave}
                label={formatColName(field)}
                placeholder={`Enter ${formatColName(field).toLowerCase()}`}
                isFormMode={true}
            />
        );
    };
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
        'Are you sure you want to delete this student? This may affect their class enrollments.'
    );
    console.log('Schemas in AllStudentsTable:', schemas);
    console.log('Students data in AllStudentsTable:', studentsData);
    
    const handleAdd = createAsyncHandler(onAddStudent, 'Error adding student');
    const handleBulkAdd = createAsyncHandler(onBulkAddStudents, 'Error bulk adding students');
    const renderCell = createCellRenderer(schemas, onSaveData);
    const renderFormField = createFormFieldRenderer();

    return (
        <Table
            data={studentsData}
            className="students-table"
            keyField="user_id"
            renderCell={renderCell}
            renderFormField={renderFormField}
            emptyMessage="No students registered"
            allowAdd={true}
            allowDelete={true}
            allowBulkAdd={true}
            hiddenColumns={['enrolledClassesList']}
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
}) => {
    // Debug logging
    console.log('StudentsTab - Full state:', state);
    console.log('StudentsTab - classesUsersData:', state.classesUsersData);
    console.log('StudentsTab - studentsData:', state.studentsData);

    // Enrich students data with class counts
    const enrichedStudents = enrichStudentsWithClassCount(
        state.studentsData, 
        state.classesUsersData || [], 
        state.classesData || [], 
        state.courseData || [], 
        state.teachersData || [], 
        state.usersData || []
    );

    console.log('StudentsTab - enriched students:', enrichedStudents);

    return (
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
                    studentsData={enrichedStudents} // Use enriched data
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
};
