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

// Helper function to create teacher data in both users and teachers tables
const createTeacherData = async (teacherData) => {
    // Get schemas for both tables
    const usersSchema = await getSchema('users');
    const teachersSchema = await getSchema('teachers');
    
    // Create user record using schema columns
    const userData = {};
    usersSchema.columns.forEach(column => {
        if (teacherData.hasOwnProperty(column)) {
            userData[column] = teacherData[column];
        }
    });
    
    // Set user level for teachers if not provided
    if (!userData.user_level) {
        userData.user_level = 1; // Teacher level
    }
    
    const userResult = await createData('users', userData);
    const userId = userResult[usersSchema.idField];
    
    // Create teacher record using schema columns
    const teacherRecord = { [usersSchema.idField]: userId };
    teachersSchema.columns.forEach(column => {
        if (column !== teachersSchema.idField && teacherData.hasOwnProperty(column)) {
            teacherRecord[column] = teacherData[column];
        }
    });
    
    await createData('teachers', teacherRecord);
    return userId;
};

// Helper function to create student data in both users and students tables
const createStudentData = async (studentData) => {
    // Get schemas for both tables
    const usersSchema = await getSchema('users');
    const studentsSchema = await getSchema('students');
    
    // Create user record using schema columns
    const userData = {};
    usersSchema.columns.forEach(column => {
        if (studentData.hasOwnProperty(column)) {
            userData[column] = studentData[column];
        }
    });
    
    // Set user level for students if not provided
    if (!userData.user_level) {
        userData.user_level = 2; // Student level
    }
    
    const userResult = await createData('users', userData);
    const userId = userResult[usersSchema.idField];
    
    // Create student record using schema columns
    const studentRecord = { [usersSchema.idField]: userId };
    studentsSchema.columns.forEach(column => {
        if (column !== studentsSchema.idField && studentData.hasOwnProperty(column)) {
            studentRecord[column] = studentData[column];
        }
    });
    
    await createData('students', studentRecord);
    return userId;
};

// Helper function to delete teacher (from both tables)
const deleteTeacherData = async (teacherId) => {
    // Delete from teachers table first (foreign key constraint)
    await deleteData('teachers', teacherId);
    // Then delete from users table
    await deleteData('users', teacherId);
};

// Helper function to delete student (from both tables)
const deleteStudentData = async (studentId) => {
    // Delete from students table first (foreign key constraint)
    await deleteData('students', studentId);
    // Then delete from users table
    await deleteData('users', studentId);
};

export const createActionHandlers = (
    { updateArrayState, updateState }, 
    { startAction, endAction }, 
    session, 
    update
) => {
    const handleSaveDataAuto = async (contextTable, id, column, value) => {
        if (!session) return;
        const actionKey = `auto-${id}-${column}`;
        startAction(actionKey);
        
        try {
            // Get all schemas to find which table contains this column
            const allSchemas = await getSchema();
            let targetTable = null;
            
            // Find the table that contains this column
            for (const [tableName, schema] of Object.entries(allSchemas)) {
                if (schema.columns.includes(column)) {
                    targetTable = tableName;
                    break;
                }
            }
            
            if (!targetTable) {
                throw new Error(`Column '${column}' not found in any table schema`);
            }
            
            // Use context table for state management
            const contextSchema = await getSchema(contextTable);
            const idField = contextSchema.idField;
            const stateKey = contextSchema.stateKey;
            
            console.log(`Auto-routing ${column} update to ${targetTable} table`);
            console.log(`Context: ${contextTable}, State key: ${stateKey}`);
            
            // Make the API call to the detected table
            await updateData(targetTable, id, { [column]: value });
            
            // Update local state using context table's schema
            if (stateKey) {
                updateArrayState(stateKey, data => 
                    data.map(item => 
                        item[idField] === id 
                            ? { ...item, [column]: value } 
                            : item
                    )
                );
                console.log(`Updated local state for ${stateKey}`);
            }
        } catch (error) {
            console.error(`Error in auto-save:`, error);
            alert(`Failed to update field: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    };

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
            updateArrayState('pendingTeachersData', data => 
                data.filter(teacher => teacher.pending_id !== pendingId)
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

    // CRUD Handlers for Teachers
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

    const handleBulkAddTeachers = async (teachersData) => {
        const actionKey = 'bulk-add-teachers';
        startAction(actionKey);
        try {
            // Process each teacher individually since we need to create in multiple tables
            for (const teacherData of teachersData) {
                await createTeacherData(teacherData);
            }
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

    // CRUD Handlers for Students
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

    const handleBulkAddStudents = async (studentsData) => {
        const actionKey = 'bulk-add-students';
        startAction(actionKey);
        try {
            // Process each student individually since we need to create in multiple tables
            for (const studentData of studentsData) {
                await createStudentData(studentData);
            }
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
