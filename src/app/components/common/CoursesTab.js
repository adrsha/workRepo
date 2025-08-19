import { Section } from './Table/Section.js';
import { Table } from './Table/index.js';
import { createFieldRenderer, createOptions } from './fieldRendererFactory.js';
import { createActionButtons } from './Table/utils.js';

// Simple field mappings for courses
const coursesFieldMappings = {
    course_name: 'text',
    course_details: 'textarea'
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

const CoursesTable = ({
    courses,
    onSaveData,
    onAddCourse,
    onDeleteCourse,
    onBulkAddCourses,
    schemas = {}
}) => {
    const newSchema = { columns: schemas.courses?.columns || [] };

    const dependencies = { schemas };
    const handlers = { onSaveData };
    const renderCell = createFieldRenderer(coursesFieldMappings, dependencies, handlers);

    const handleDelete = createConfirmHandler(
        createAsyncHandler(onDeleteCourse, 'Error deleting course'),
        'Are you sure you want to delete this course? This may affect classes using this course.'
    );

    const handleAdd = createAsyncHandler(onAddCourse, 'Error adding course');
    const handleBulkAdd = createAsyncHandler(onBulkAddCourses, 'Error bulk adding courses');

    return (
        <Table
            data={courses}
            schema={newSchema}
            renderCell={renderCell}
            fieldMappings={coursesFieldMappings}
            dependencies={dependencies}
            handlers={handlers}
            className="courses-table"
            keyField="course_id"
            createFieldRenderer={renderCell}
            dropdownOptions={{}}
            additionalColumns={[]}
            emptyMessage="No courses available"
            allowAdd={true}
            allowDelete={true}
            allowBulkAdd={true}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onBulkAdd={handleBulkAdd}
            requiredFields={['course_name', 'course_details']}
            tableName="Course"
        />
    );
};

export const CoursesTab = ({
    state,
    actionInProgress,
    handleSaveData,
    handleAddCourse,
    handleDeleteCourse,
    handleBulkAddCourses,
    schemas = {}
}) => (
    <Section title="Courses" className="courses-section scrollable">
        {console.log(state.courseData)}
        <CoursesTable
            courses={state.courseData || []}
            onSaveData={handleSaveData}
            onAddCourse={handleAddCourse}
            onDeleteCourse={handleDeleteCourse}
            onBulkAddCourses={handleBulkAddCourses}
            schemas={schemas}
        />
    </Section>
);
