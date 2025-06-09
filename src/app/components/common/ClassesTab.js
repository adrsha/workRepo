import { Section } from './Table/Section.js';
import { EditableField } from '../EditableField';
import { EditableDropdown } from '../EditableDropdown';
import { EditableStartTime } from '../EditableTimeSchedule';
import { Table } from './Table/index.js';
import { formatColName } from '../../lib/utils';

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
            teacher_id: () => (
                <EditableDropdown
                    initialValue={classItem.teacher_id || ''}
                    onSave={onSave}
                    options={createOptions(teachersData, 'user_id', 'user_name')}
                    placeholder="Select a teacher"
                    label={formatColName(col)}
                />
            ),
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
    onSaveData,
    onMultiSaveData,
    onAddClass,
    onDeleteClass,
    onBulkAddClasses,
    schemas = {}
}) => {
    const renderCell = createFieldRenderer(teachersData, courseData, gradesData, onSaveData, onMultiSaveData);
    const renderFormField = createFormFieldRenderer(teachersData, courseData, gradesData);

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

    return (
        <Table
            data={classes}
            className="classes-table"
            keyField="class_id"
            renderCell={renderCell}
            renderFormField={renderFormField}
            dropdownOptions={dropdownOptions}
            emptyMessage="No classes available"
            allowAdd={true}
            allowDelete={true}
            allowBulkAdd={true}
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
            onSaveData={handleSaveData}
            onMultiSaveData={handleMultiSaveData}
            onAddClass={handleAddClass}
            onDeleteClass={handleDeleteClass}
            onBulkAddClasses={handleBulkAddClasses}
            schemas={schemas}
        />
    </Section>
);
