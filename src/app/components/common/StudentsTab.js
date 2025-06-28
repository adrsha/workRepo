
// Updated ClassesTab.js
import { Section } from './Table/Section.js';
import { Table } from './Table/index.js';
import { createFieldRenderer, createOptions, createAsyncHandler, createConfirmHandler } from './fieldRendererFactory';
import { studentsFieldMappings } from './tabFieldMappings';

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

const enrichStudentsWithClassData = (studentsData, classesUsersData, classesData = [], teachersData = [], courseData = []) =>
    studentsData.map(student => ({
        ...student,
        enrolled_classes: getClassCountForStudent(student.user_id, classesUsersData),
        enrolled_classes_list: getEnrolledClassesForStudent(student.user_id, classesUsersData, classesData, teachersData, courseData)
    }));

const StudentsTable = ({
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
    const enrichedStudents = enrichStudentsWithClassData(students, classesUsersData, classesData, teachersData, courseData);

    const dependencies = { gradesData, rolesData, schemas };
    const handlers = { onSaveData, onMultiSaveData };
    const renderCell = createFieldRenderer(studentsFieldMappings, dependencies, handlers);

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
            className="students-table"
            keyField="user_id"
            renderCell={renderCell}
            fieldMappings={studentsFieldMappings}
            dependencies={dependencies}
            handlers={handlers}
            createFieldRenderer={renderCell}
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
            requiredFields={['user_name', 'user_email', 'grade_id', 'role_id']}
            tableName="Student"
        />
    );
};

export const StudentsTab = ({
    state,
    handleSaveData,
    handleMultiSaveData,
    handleAddStudent,
    handleDeleteStudent,
    handleBulkAddStudents,
    schemas = {}
}) => (
        <Section title="Students" className="students-section scrollable">
            <StudentsTable
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
    );
