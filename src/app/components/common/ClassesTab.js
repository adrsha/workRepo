import { Section } from './Table/Section.js';
import { EditableField } from '../EditableField';
import { EditableDropdown } from '../EditableDropdown';
import { EditableStartTime } from '../EditableTimeSchedule';
import { Table } from './Table/index.js';
import { formatColName } from '../../lib/utils';
import { useState } from 'react';

// EnrolledStudentsCell Component
const EnrolledStudentsCell = ({ classId, enrolledCount, enrolledStudents }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggle = () => {
        setIsExpanded(!isExpanded);
    };

    const handleStudentClick = (userId, e) => {
        e.stopPropagation(); // Prevent triggering the expand/collapse
        window.open(`/profile/${userId}`, '_blank');
    };

    return (
        <div className="enrolled-students-container">
            <div
                className="enrolled-students-count clickable"
                onClick={handleToggle}
                title="Click to view enrolled students"
            >
                <span className="student-count-badge">
                    {enrolledCount} student{enrolledCount !== 1 ? 's' : ''}
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                        {isExpanded ? '▼' : '▶'}
                    </span>
                </span>
            </div>

            {isExpanded && (
                <div className="enrolled-students-list">
                    {enrolledStudents.length > 0 ? (
                        <div className="students-grid">
                            {enrolledStudents.map((student) => (
                                <div
                                    key={student.user_id}
                                    className="student-item"
                                    onClick={(e) => handleStudentClick(student.user_id, e)}
                                    title={`Click to view ${student.user_name}'s profile`}
                                >
                                    <div className="student-name">{student.user_name}</div>
                                    {student.contact && (
                                        <div className="student-contact">{student.contact}</div>
                                    )}
                                    <div className="profile-link-icon">👤</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-students">No students enrolled</div>
                    )}
                </div>
            )}
        </div>
    );
};

const createOptions = (data, valueKey, labelKey) =>
    data.map(item => ({ value: item[valueKey], label: item[labelKey] }));

const getTableForColumn = (schemas, column) => {
    for (const [tableName, schema] of Object.entries(schemas)) {
        if (schema.columns.includes(column)) {
            return tableName;
        }
    }
    return 'classes';
};

// Utility function to calculate user count for each class
const getUserCountForClass = (classId, classesUsersData) => {
    return classesUsersData.filter(relation => relation.class_id === classId).length;
};

// Utility function to get enrolled students for a class with their details
const getEnrolledStudentsForClass = (classId, classesUsersData, usersData) => {
    const classUserRelations = classesUsersData.filter(relation => relation.class_id === classId);
    return classUserRelations.map(relation => {
        const user = usersData.find(user => user.user_id === relation.user_id);
        return {
            user_id: relation.user_id,
            user_name: user?.user_name || 'Unknown User',
            user_email: user?.user_email || '',
            ...user
        };
    }).filter(student => student.user_name !== 'Unknown User');
};

// Utility function to enrich classes data with user counts and student lists
const enrichClassesWithUserData = (classesData, classesUsersData, usersData = []) => {
    return classesData.map(classItem => ({
        ...classItem,
        enrolled_students: getUserCountForClass(classItem.class_id, classesUsersData),
        enrolled_students_list: getEnrolledStudentsForClass(classItem.class_id, classesUsersData, usersData)
    }));
};

const createFieldRenderer = (teachersData, courseData, gradesData, onSaveData, onMultiSaveData) => {
    return (classItem, col) => {
        const isTimeField = col === 'start_time' || col === 'end_time';
        const onSave = isTimeField ?
            (value) => onMultiSaveData('classes', classItem.class_id, { [col]: value }) :
            (value) => onSaveData('classes', classItem.class_id, col, value);

        const fieldMap = {
            class_description: () => (
                <EditableField
                    initialValue={classItem.class_description || 'No description'}
                    onSave={onSave}
                    placeholder="Enter class description"
                    label={formatColName(col)}
                />
            ),
            cost: () => (
                <EditableField
                    initialValue={classItem.cost || 'Free'}
                    onSave={onSave}
                    placeholder="Enter Cost"
                    label={formatColName(col)}
                />
            ),
            teacher_id: () => {
                return <EditableDropdown
                    initialValue={classItem.teacher_id || ''}
                    onSave={onSave}
                    options={createOptions(teachersData, 'user_id', 'user_name')}
                    placeholder="Select a teacher"
                    label={formatColName(col)}
                />
            },
            course_id: () => (
                <EditableDropdown
                    initialValue={classItem.course_id || ''}
                    onSave={onSave}
                    options={createOptions(courseData, 'course_id', 'course_name')}
                    placeholder="Select a course"
                    label={formatColName(col)}
                />
            ),
            grade_id: () => (
                <EditableDropdown
                    initialValue={classItem.grade_id || ''}
                    onSave={onSave}
                    options={createOptions(gradesData, 'grade_id', 'grade_name')}
                    placeholder="Select a grade"
                    label={formatColName(col)}
                />
            ),
            start_time: () => (
                <EditableStartTime
                    initialDateTime={classItem.start_time || ''}
                    onSave={onSave}
                    label={formatColName(col)}
                />
            ),
            end_time: () => (
                <EditableStartTime
                    initialDateTime={classItem.end_time || ''}
                    onSave={onSave}
                    label={formatColName(col)}
                />
            ),
            enrolled_students: () => (
                <EnrolledStudentsCell
                    classId={classItem.class_id}
                    enrolledCount={classItem.enrolled_students || 0}
                    enrolledStudents={classItem.enrolled_students_list || []}
                />
            )
        };

        const renderField = fieldMap[col];
        if (renderField) return renderField();

        return (
            <EditableField
                initialValue={classItem[col] || ''}
                onSave={onSave}
                label={formatColName(col)}
                placeholder={`Enter ${formatColName(col).toLowerCase()}`}
            />
        );
    };
};

const createFormFieldRenderer = (teachersData, courseData, gradesData) => {
    return (field, value, onChange, { error }) => {
        const onSave = (newValue) => onChange(field, newValue);
        const fieldWithError = { [field]: value, className: error ? 'error' : '' };

        // Don't render enrolled_students in forms since it's calculated
        if (field === 'enrolled_students') {
            return null;
        }

        const fieldMap = {
            class_description: () => (
                <EditableField
                    initialValue={fieldWithError[field]}
                    onSave={onSave}
                    placeholder="Enter class description"
                    label={formatColName(field)}
                    isFormMode={true}
                />
            ),
            cost: () => (
                <EditableField
                    initialValue={fieldWithError[field]}
                    onSave={onSave}
                    placeholder="Enter Cost"
                    label={formatColName(field)}
                    isFormMode={true}
                />
            ),
            teacher_id: () => (
                <EditableDropdown
                    initialValue={fieldWithError[field]}
                    onSave={onSave}
                    options={createOptions(teachersData, 'user_id', 'user_name')}
                    placeholder="Select a teacher"
                    label={formatColName(field)}
                    isFormMode={true}
                />
            ),
            course_id: () => (
                <EditableDropdown
                    initialValue={fieldWithError[field]}
                    onSave={onSave}
                    options={createOptions(courseData, 'course_id', 'course_name')}
                    placeholder="Select a course"
                    label={formatColName(field)}
                    isFormMode={true}
                />
            ),
            grade_id: () => (
                <EditableDropdown
                    initialValue={fieldWithError[field]}
                    onSave={onSave}
                    options={createOptions(gradesData, 'grade_id', 'grade_name')}
                    placeholder="Select a grade"
                    label={formatColName(field)}
                    isFormMode={true}
                />
            ),
            start_time: () => (
                <EditableStartTime
                    initialValue={fieldWithError[field]}
                    onSave={onSave}
                    label={formatColName(field)}
                    isFormMode={true}
                />
            ),
            end_time: () => (
                <EditableStartTime
                    initialValue={fieldWithError[field]}
                    onSave={onSave}
                    label={formatColName(field)}
                    isFormMode={true}
                />
            )
        };

        const renderField = fieldMap[field];
        if (renderField) return renderField();

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

const ApprovedClassesTable = ({
    classes,
    teachersData,
    courseData,
    gradesData,
    classesUsersData = [], // New prop
    usersData = [], // New prop for all users
    onSaveData,
    onMultiSaveData,
    onAddClass,
    onDeleteClass,
    onBulkAddClasses,
    schemas = {}
}) => {
    // Enrich classes data with user counts
    const enrichedClasses = enrichClassesWithUserData(classes, classesUsersData, usersData);

    const renderCell = createFieldRenderer(teachersData, courseData, gradesData, onSaveData, onMultiSaveData);
    const renderFormField = createFormFieldRenderer(teachersData, courseData, gradesData);

    const handleDelete = createConfirmHandler(
        createAsyncHandler(onDeleteClass, 'Error deleting class'),
        'Are you sure you want to delete this class? This may affect enrolled students.'
    );

    const handleAdd = createAsyncHandler(onAddClass, 'Error adding class');
    const handleBulkAdd = createAsyncHandler(onBulkAddClasses, 'Error bulk adding classes');

    const dropdownOptions = {
        teacher_id: createOptions(teachersData, 'user_id', 'teacher_name'),
        course_id: createOptions(courseData, 'course_id', 'course_name'),
        grade_id: createOptions(gradesData, 'grade_id', 'grade_name'),
    };
    
    const additionalColumns = [
        {
            key: 'class_link',
            title: 'Class Link',
            render: (classEl) => {
                return <a href={`/classes/${classEl.class_id}`}>Visit Class</a>;
            }
        },
    ];

    return (
        <Table
            data={enrichedClasses} // Use enriched data
            className="classes-table"
            keyField="class_id"
            renderCell={renderCell}
            renderFormField={renderFormField}
            dropdownOptions={dropdownOptions}
            additionalColumns={additionalColumns}
            emptyMessage="No classes available"
            allowAdd={true}
            allowDelete={true}
            allowBulkAdd={true}
            hiddenColumns={['enrolled_students_list']}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onBulkAdd={handleBulkAdd}
            requiredFields={['course_id', 'teacher_id', 'grade_id', 'start_time', 'end_time']}
            tableName="Class"
        />
    );
};

export const ClassesTab = ({
    state,
    handleSaveData,
    handleMultiSaveData,
    handleAddClass,
    handleDeleteClass,
    handleBulkAddClasses,
    schemas = {}
}) => (
    <Section title="Approved Classes" className="classes-section scrollable">
        <ApprovedClassesTable
            classes={state.classesData}
            teachersData={state.teachersData}
            courseData={state.courseData}
            gradesData={state.gradesData}
            classesUsersData={state.classesUsersData} // Pass the junction table data
            usersData={state.usersData} // Pass all users data
            onSaveData={handleSaveData}
            onMultiSaveData={handleMultiSaveData}
            onAddClass={handleAddClass}
            onDeleteClass={handleDeleteClass}
            onBulkAddClasses={handleBulkAddClasses}
            schemas={schemas}
        />
    </Section>
);
