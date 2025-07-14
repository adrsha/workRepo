import { Section } from './Table/Section.js';
import { Table } from './Table/index.js';
import { createFieldRenderer, createOptions } from './fieldRendererFactory.js';
import { classesFieldMappings } from  './tabFieldMappings.js';

const getUserCountForClass = (classId, classesUsersData) =>
    classesUsersData.filter(relation => relation.class_id === classId).length;

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

const enrichClassesWithUserData = (classesData, classesUsersData, usersData = []) =>
    classesData.map(classItem => ({
        ...classItem,
        enrolled_students: getUserCountForClass(classItem.class_id, classesUsersData),
        enrolled_students_list: getEnrolledStudentsForClass(classItem.class_id, classesUsersData, usersData)
    }));

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

const ApprovedClassesTable = ({
    classes,
    teachersData,
    courseData,
    gradesData,
    classesUsersData = [],
    usersData = [],
    onSaveData,
    onMultiSaveData,
    onAddClass,
    onDeleteClass,
    onBulkAddClasses,
    schemas = {}
}) => {
    const enrichedClasses = enrichClassesWithUserData(classes, classesUsersData, usersData);
    const dependencies = { teachersData, courseData, gradesData, schemas };
    const handlers = { onSaveData, onMultiSaveData };
    const renderCell = createFieldRenderer(classesFieldMappings, dependencies, handlers);

    const handleDelete = createConfirmHandler(
        createAsyncHandler(onDeleteClass, 'Error deleting class'),
        'Are you sure you want to delete this class? This may affect enrolled students.'
    );

    const handleAdd = createAsyncHandler(onAddClass, 'Error adding class');
    const handleBulkAdd = createAsyncHandler(onBulkAddClasses, 'Error bulk adding classes');

    const dropdownOptions = {
        teacher_id: createOptions(teachersData, 'user_id', 'user_name'),
        course_id: createOptions(courseData, 'course_id', 'course_name'),
        grade_id: createOptions(gradesData, 'grade_id', 'grade_name'),
    };

    const additionalColumns = [{
        key: 'class_link',
        title: 'Class Link',
        render: (classEl) => <a href={`/classes/${classEl.class_id}`}>Visit Class</a>
    }];

    return (
        <Table
            data={enrichedClasses}
            schema={schemas.classes}
            renderCell={renderCell}
            fieldMappings={classesFieldMappings}
            dependencies={dependencies}
            handlers={handlers}
            className="classes-table"
            keyField="class_id"
            createFieldRenderer={renderCell}
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
                classesUsersData={state.classesUsersData}
                usersData={state.usersData}
                onSaveData={handleSaveData}
                onMultiSaveData={handleMultiSaveData}
                onAddClass={handleAddClass}
                onDeleteClass={handleDeleteClass}
                onBulkAddClasses={handleBulkAddClasses}
                schemas={schemas}
            />
        </Section>
    );
