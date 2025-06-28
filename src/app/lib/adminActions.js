import { fetchViewData } from './helpers.js';
import { getSchema, getIdField, getStateKey } from './schema.js';

export const pendingTeachers = async (pendingId, approved) => {
    const authToken = localStorage.getItem('authToken');

    const response = await fetch('/api/pendingTeachers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pendingId, approved }),
    });

    if (!response.ok) {
        throw new Error(`Failed to ${approved ? 'approve' : 'deny'} teacher`);
    }

    return response.json();
};

export const updateData = async (table, id, updates) => {
    const authToken = localStorage.getItem('authToken');
    
    const response = await fetch('/api/changeData', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ table, id, updates }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update ${table}`);
    }

    return response.json();
};

export const createData = async (table, data) => {
    const authToken = localStorage.getItem('authToken');
    console.log(table, data)

    const response = await fetch('/api/changeData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ table, data }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create ${table}`);
    }

    return response.json();
};

export const deleteData = async (table, id) => {
    const authToken = localStorage.getItem('authToken');

    const response = await fetch('/api/changeData', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ table, id }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete ${table}`);
    }

    return response.json();
};

export const bulkCreateData = async (table, dataArray) => {
    const authToken = localStorage.getItem('authToken');

    const response = await fetch('/api/changeData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ table, data: dataArray, bulk: true }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to bulk create ${table}`);
    }

    return response.json();
};

export const processStudentAction = async (endpoint, data) => {
    const authToken = localStorage.getItem('authToken');

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
    }

    return response.json();
};

// UPDATED: Helper function to create teacher data using the view approach
const createTeacherData = async (teacherData) => {
    // Use the teachers_view to create both user and teacher records in one call
    // The API will handle the separation and creation of both records
    const result = await createData('teachers_view', teacherData);
    return result.insertId;
};

// UPDATED: Helper function to create student data using the view approach
const createStudentData = async (studentData) => {
    // Use the students_view to create both user and student records in one call
    // The API will handle the separation and creation of both records
    const result = await createData('students_view', studentData);
    return result.insertId;
};

// UPDATED: Helper function to delete teacher using the view approach
const deleteTeacherData = async (teacherId) => {
    // Use the teachers_view for deletion - the API will handle cascading deletes
    await deleteData('teachers_view', teacherId);
};

// UPDATED: Helper function to delete student using the view approach
const deleteStudentData = async (studentId) => {
    // Use the students_view for deletion - the API will handle cascading deletes
    await deleteData('students_view', studentId);
};

export const createActionHandlers = (
    { updateArrayState, updateState },
    { startAction, endAction },
    session,
    update
) => {

    const handleSaveData = async (table, id, column, value) => {
        if (!session) return;
        const actionKey = `${table}-${id}-${column}`;
        startAction(actionKey);

        try {
            let targetTable = table;
            let targetId = id;

            if (table === 'teachers' || table === 'students') {
                const usersSchema = await getSchema('users');
                const targetSchema = await getSchema(table);

                // If the column exists in users table but not in target table, route to users
                if (usersSchema.columns.includes(column) && !targetSchema.columns.includes(column)) {
                    targetTable = 'users';
                    targetId = id; // Assuming the ID passed is already the user_id
                    console.log(`Routing ${column} update from ${table} to users table`);
                }
            }

            // Use schema to get proper ID field and state key for the original table (for state updates)
            const schema = await getSchema(table);
            const idField = schema.idField;
            const stateKey = schema.stateKey;

            console.log(`Updating ${targetTable} with ID ${targetId}, field ${column} = ${value}`);
            console.log(`Using ID field: ${idField}, State key: ${stateKey}`);

            // Make the API call to the correct table
            await updateData(targetTable, targetId, { [column]: value });

            // Update local state using original table's schema information
            if (stateKey) {
                updateArrayState(stateKey, data =>
                    data.map(item =>
                        item[idField] === id
                            ? { ...item, [column]: value }
                            : item
                    )
                );
                console.log(`Updated local state for ${stateKey}`);
            } else {
                console.warn(`No state key found for table: ${table}`);
            }
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            alert(`Failed to update ${table}: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    };

    const handleMultiSaveData = async (table, id, updates) => {
        if (!session) return;
        const actionKey = `${table}-${id}-multi`;
        startAction(actionKey);

        try {
            // Use schema to get proper ID field and state key
            const schema = await getSchema(table);
            const idField = schema.idField;
            const stateKey = schema.stateKey;

            console.log(`Multi-updating ${table} with ID ${id}:`, updates);
            console.log(`Using ID field: ${idField}, State key: ${stateKey}`);

            // Make the API call
            await updateData(table, id, updates);

            // Update local state using schema information
            if (stateKey) {
                updateArrayState(stateKey, data =>
                    data.map(item =>
                        item[idField] === id
                            ? { ...item, ...updates }
                            : item
                    )
                );
                console.log(`Updated local state for ${stateKey}`);
            } else {
                console.warn(`No state key found for table: ${table}`);
            }
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            alert(`Failed to update ${table}: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    };

    const handleTeacherAction = async (pendingId, approved) => {
        const actionKey = `teacher-${approved ? 'approve' : 'deny'}-${pendingId}`;
        startAction(actionKey);
        try {
            await pendingTeachers(pendingId, approved);
            updateArrayState('pendingTeachersData', data => {
                console.log("PTD", data)
                return data.filter(teacher => teacher.pending_id !== pendingId)
            }
            );
            if (approved) {
                const updatedTeachers = await fetchViewData('teachers_view');
                updateState({ teachersData: updatedTeachers });
            }
        } catch (error) {
            console.error('Failed to process teacher action:', error);
            alert(`Failed to ${approved ? 'approve' : 'deny'} teacher: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    };

    const handleStudentQueueApproval = async (classId, userId, pendingId) => {
        const actionKey = `student-approve-${pendingId}`;
        startAction(actionKey);
        try {
            await processStudentAction('/api/acceptPayment', { classId, userId, pendingId });

            updateArrayState('studentsQueued', data =>
                data.filter(student => student.pending_id !== pendingId)
            );
            const updatedStudents = await fetchViewData('students_view');
            updateState({ studentsData: updatedStudents });
            update();
        } catch (error) {
            console.error('Error:', error);
            alert(`Failed to approve student: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    };

    const handleStudentQueueRejection = async (pendingId) => {
        const actionKey = `student-reject-${pendingId}`;
        startAction(actionKey);
        try {
            await processStudentAction('/api/rejectPayment', { pendingId });

            updateArrayState('studentsQueued', data =>
                data.filter(student => student.pending_id !== pendingId)
            );
            update();
        } catch (error) {
            console.error('Error:', error);
            alert(`Failed to reject student: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    };

    // UPDATED: CRUD Handlers for Teachers - now using view approach
    const handleAddTeacher = async (teacherData) => {
        const actionKey = 'add-teacher';
        startAction(actionKey);
        try {
            await createTeacherData(teacherData);
            // Refresh the full teacher data
            const updatedTeachers = await fetchViewData('teachers_view');
            updateState({ teachersData: updatedTeachers });
        } catch (error) {
            console.error('Error adding teacher:', error);
            throw error; // Re-throw to prevent form from closing
        } finally {
            endAction(actionKey);
        }
    };

    const handleDeleteTeacher = async (teacherId) => {
        const actionKey = `delete-teacher-${teacherId}`;
        startAction(actionKey);
        try {
            await deleteTeacherData(teacherId);
            updateArrayState('teachersData', data =>
                data.filter(teacher => teacher.user_id !== teacherId)
            );
        } catch (error) {
            console.error('Error deleting teacher:', error);
            throw error;
        } finally {
            endAction(actionKey);
        }
    };

    // UPDATED: Bulk add teachers - now using view approach
    const handleBulkAddTeachers = async (teachersData) => {
        const actionKey = 'bulk-add-teachers';
        startAction(actionKey);
        try {
            // Use the bulk creation with teachers_view
            await bulkCreateData('teachers_view', teachersData);
            // Refresh the full teacher data
            const updatedTeachers = await fetchViewData('teachers_view');
            updateState({ teachersData: updatedTeachers });
        } catch (error) {
            console.error('Error bulk adding teachers:', error);
            throw error;
        } finally {
            endAction(actionKey);
        }
    };

    // CRUD Handlers for Classes
    const handleAddClass = async (classData) => {
        const actionKey = 'add-class';
        startAction(actionKey);
        try {
            await createData('classes', classData);
            const updatedClasses = await fetchViewData('classes_view');
            updateState({ classesData: updatedClasses });
        } catch (error) {
            console.error('Error adding class:', error);
            throw error;
        } finally {
            endAction(actionKey);
        }
    };

    const handleDeleteClass = async (classId) => {
        const actionKey = `delete-class-${classId}`;
        startAction(actionKey);
        try {
            await deleteData('classes', classId);
            updateArrayState('classesData', data =>
                data.filter(cls => cls.class_id !== classId)
            );
        } catch (error) {
            console.error('Error deleting class:', error);
            throw error;
        } finally {
            endAction(actionKey);
        }
    };

    const handleBulkAddClasses = async (classesData) => {
        const actionKey = 'bulk-add-classes';
        startAction(actionKey);
        try {
            await bulkCreateData('classes', classesData);
            // Refresh the full class data
            const updatedClasses = await fetchViewData('classes_view');
            updateState({ classesData: updatedClasses });
        } catch (error) {
            console.error('Error bulk adding classes:', error);
            throw error;
        } finally {
            endAction(actionKey);
        }
    };

    // UPDATED: CRUD Handlers for Students - now using view approach
    const handleAddStudent = async (studentData) => {
        const actionKey = 'add-student';
        startAction(actionKey);
        try {
            await createStudentData(studentData);
            // Refresh the full student data
            const updatedStudents = await fetchViewData('students_view');
            updateState({ studentsData: updatedStudents });
        } catch (error) {
            console.error('Error adding student:', error);
            throw error;
        } finally {
            endAction(actionKey);
        }
    };

    const handleDeleteStudent = async (studentId) => {
        const actionKey = `delete-student-${studentId}`;
        startAction(actionKey);
        try {
            await deleteStudentData(studentId);
            updateArrayState('studentsData', data =>
                data.filter(student => student.user_id !== studentId)
            );
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        } finally {
            endAction(actionKey);
        }
    };

    // UPDATED: Bulk add students - now using view approach
    const handleBulkAddStudents = async (studentsData) => {
        const actionKey = 'bulk-add-students';
        startAction(actionKey);
        try {
            // Use the bulk creation with students_view
            await bulkCreateData('students_view', studentsData);
            // Refresh the full student data
            const updatedStudents = await fetchViewData('students_view');
            updateState({ studentsData: updatedStudents });
        } catch (error) {
            console.error('Error bulk adding students:', error);
            throw error;
        } finally {
            endAction(actionKey);
        }
    };

    return {
        handleSaveData,
        handleMultiSaveData,
        handleTeacherAction,
        handleStudentQueueApproval,
        handleStudentQueueRejection,
        // CRUD handlers
        handleAddTeacher,
        handleDeleteTeacher,
        handleBulkAddTeachers,
        handleAddClass,
        handleDeleteClass,
        handleBulkAddClasses,
        handleAddStudent,
        handleDeleteStudent,
        handleBulkAddStudents
    };
};
