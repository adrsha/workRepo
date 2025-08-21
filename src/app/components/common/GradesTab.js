import { Section } from './Table/Section.js';
import { Table } from './Table/index.js';
import { createFieldRenderer } from './fieldRendererFactory.js';
import { gradesFieldMappings } from './tabFieldMappings.js';

// Simple async handler wrapper
const createAsyncHandler = (fn, errorMessage) => async (...args) => {
    try {
        await fn(...args);
    } catch (error) {
        alert(`${errorMessage}: ${error.message}`);
        throw error;
    }
};

// Confirmation handler wrapper
const createConfirmHandler = (fn, message) => async (...args) => {
    if (window.confirm(message)) {
        await fn(...args);
    }
};

const GradesTable = ({
    grades,
    onSaveData,
    onAddGrade,
    onDeleteGrade,
    onBulkAddGrades,
    schemas = {}
}) => {
    // Filter out grade_id from schema columns for display
    const originalColumns = schemas.grades?.columns || [];
    const filteredColumns = originalColumns.filter(col => col !== 'grade_id');
    const newSchema = { columns: filteredColumns };
    
    // Set up dependencies and handlers for field renderer
    const dependencies = { schemas };
    const handlers = { onSaveData };

    // Create the field renderer using the proper field mappings
    const renderCell = createFieldRenderer(gradesFieldMappings, dependencies, handlers);

    // Create wrapped handlers with error handling
    const handleDelete = createConfirmHandler(
        createAsyncHandler(onDeleteGrade, 'Error deleting grade'),
        'Are you sure you want to delete this grade? This may affect students using this grade.'
    );

    const handleAdd = createAsyncHandler(onAddGrade, 'Error adding grade');
    const handleBulkAdd = createAsyncHandler(onBulkAddGrades, 'Error bulk adding grades');

    return (
        <Table
            data={grades}
            schema={newSchema}
            renderCell={renderCell}
            fieldMappings={gradesFieldMappings}
            dependencies={dependencies}
            handlers={handlers}
            className="grades-table"
            keyField="grade_id"
            createFieldRenderer={renderCell}
            emptyMessage="No grades available"
            allowAdd={true}
            allowDelete={true}
            allowBulkAdd={true}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onBulkAdd={handleBulkAdd}
            requiredFields={['grade_name', 'grade_type']}
            tableName="Grade"
        />
    );
};

export const GradesTab = ({
    state,
    actionInProgress,
    handleSaveData,
    handleAddGrade,
    handleDeleteGrade,
    handleBulkAddGrades,
    schemas = {}
}) => (
    <Section title="Grades" className="grades-section scrollable">
        <GradesTable
            grades={state.gradesData || []}
            onSaveData={handleSaveData}
            onAddGrade={handleAddGrade}
            onDeleteGrade={handleDeleteGrade}
            onBulkAddGrades={handleBulkAddGrades}
            schemas={schemas}
        />
    </Section>
);
