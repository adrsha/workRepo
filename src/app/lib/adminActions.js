import { fetchViewData } from './helpers.js';
import { getSchema, getIdField, getStateKey } from './schema.js';

// Generic API request function
const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    const authToken = localStorage.getItem('authToken');
    
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    return response.json();
};

// File operations
export const listFiles = async (directory = '') => {
    return makeAuthenticatedRequest(`/api/files/list?directory=${encodeURIComponent(directory)}`, {
        method: 'GET',
        headers: {
            'Content-Type': undefined, // Remove content-type for GET request
        },
    });
};

export const updateFilePath = async (table, id, fileField, newFilePath) => {
    return makeAuthenticatedRequest('/api/changeData', {
        method: 'PUT',
        body: JSON.stringify({ 
            table, 
            id, 
            updates: { [fileField]: newFilePath } 
        }),
    });
};

// Teacher approval
export const pendingTeachers = async (pendingId, approved) => {
    return makeAuthenticatedRequest('/api/pendingTeachers', {
        method: 'POST',
        body: JSON.stringify({ pendingId, approved }),
    });
};

// Generic CRUD operations
export const updateData = async (table, id, updates) => {
    return makeAuthenticatedRequest('/api/changeData', {
        method: 'PUT',
        body: JSON.stringify({ table, id, updates }),
    });
};

export const createData = async (table, data, bulk = false) => {
    return makeAuthenticatedRequest('/api/changeData', {
        method: 'POST',
        body: JSON.stringify({ table, data, ...(bulk && { bulk }) }),
    });
};

export const deleteData = async (table, id) => {
    return makeAuthenticatedRequest('/api/changeData', {
        method: 'DELETE',
        body: JSON.stringify({ table, id }),
    });
};

export const bulkCreateData = async (table, dataArray) => {
    return createData(table, dataArray, true);
};

export const processStudentAction = async (endpoint, data) => {
    return makeAuthenticatedRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Generic entity operations
const createEntityData = async (viewName, entityData) => {
    const result = await createData(viewName, entityData);
    return result.insertId;
};

const deleteEntityData = async (viewName, entityId) => {
    await deleteData(viewName, entityId);
};

// Specific entity operations using generic functions
const createTeacherData = async (teacherData) => {
    return createEntityData('teachers_view', teacherData);
};

const createStudentData = async (studentData) => {
    return createEntityData('students_view', studentData);
};

const deleteTeacherData = async (teacherId) => {
    return deleteEntityData('teachers_view', teacherId);
};

const deleteStudentData = async (studentId) => {
    return deleteEntityData('students_view', studentId);
};

// Generic action handler creator
const createGenericActionHandler = (actionName, operation) => {
    return async (...args) => {
        const actionKey = `${actionName}-${args[0] || 'action'}`;
        const { startAction, endAction } = args[args.length - 1].actionHelpers;
        
        startAction(actionKey);
        try {
            return await operation(...args.slice(0, -1));
        } catch (error) {
            console.error(`Error in ${actionName}:`, error);
            throw error;
        } finally {
            endAction(actionKey);
        }
    };
};

export const createActionHandlers = (
    { updateArrayState, updateState },
    { startAction, endAction },
    session,
    update
) => {
    const actionHelpers = { startAction, endAction };

    // Generic save handler
    const handleSaveData = async (table, id, column, value) => {
        if (!session) return;
        
        const actionKey = `${table}-${id}-${column}`;
        startAction(actionKey);

        try {
            const { targetTable, targetId } = await getTargetTableAndId(table, id, column);
            const schema = await getSchema(table);
            
            await updateData(targetTable, targetId, { [column]: value });
            
            if (schema.stateKey) {
                updateArrayState(schema.stateKey, data =>
                    data.map(item =>
                        item[schema.idField] === id
                            ? { ...item, [column]: value }
                            : item
                    )
                );
            }
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            alert(`Failed to update ${table}: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    };

    // Helper function to determine target table and ID
    const getTargetTableAndId = async (table, id, column) => {
        if (table === 'teachers' || table === 'students') {
            const usersSchema = await getSchema('users');
            const targetSchema = await getSchema(table);

            if (usersSchema.columns.includes(column) && !targetSchema.columns.includes(column)) {
                return { targetTable: 'users', targetId: id };
            }
        }
        return { targetTable: table, targetId: id };
    };

    const handleMultiSaveData = async (table, id, updates) => {
        if (!session) return;
        
        const actionKey = `${table}-${id}-multi`;
        startAction(actionKey);

        try {
            const schema = await getSchema(table);
            
            await updateData(table, id, updates);
            
            if (schema.stateKey) {
                updateArrayState(schema.stateKey, data =>
                    data.map(item =>
                        item[schema.idField] === id
                            ? { ...item, ...updates }
                            : item
                    )
                );
            }
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            alert(`Failed to update ${table}: ${error.message}`);
        } finally {
            endAction(actionKey);
        }
    };

    // Generic CRUD handlers
    const createCRUDHandlers = (entityType, viewName, stateKey, idField) => {
        return {
            [`handleAdd${entityType}`]: async (entityData) => {
                const actionKey = `add-${entityType.toLowerCase()}`;
                startAction(actionKey);
                try {
                    await createEntityData(viewName, entityData);
                    const updatedData = await fetchViewData(viewName);
                    updateState({ [stateKey]: updatedData });
                } catch (error) {
                    console.error(`Error adding ${entityType.toLowerCase()}:`, error);
                    throw error;
                } finally {
                    endAction(actionKey);
                }
            },

            [`handleDelete${entityType}`]: async (entityId) => {
                const actionKey = `delete-${entityType.toLowerCase()}-${entityId}`;
                startAction(actionKey);
                try {
                    await deleteEntityData(viewName, entityId);
                    updateArrayState(stateKey, data =>
                        data.filter(item => item[idField] !== entityId)
                    );
                } catch (error) {
                    console.error(`Error deleting ${entityType.toLowerCase()}:`, error);
                    throw error;
                } finally {
                    endAction(actionKey);
                }
            },

            [`handleBulkAdd${entityType}`]: async (entitiesData) => {
                const actionKey = `bulk-add-${entityType.toLowerCase()}s`;
                startAction(actionKey);
                try {
                    await bulkCreateData(viewName, entitiesData);
                    const updatedData = await fetchViewData(viewName);
                    updateState({ [stateKey]: updatedData });
                } catch (error) {
                    console.error(`Error bulk adding ${entityType.toLowerCase()}s:`, error);
                    throw error;
                } finally {
                    endAction(actionKey);
                }
            }
        };
    };

    // Create CRUD handlers for each entity type
    const teacherHandlers = createCRUDHandlers('Teacher', 'teachers_view', 'teachersData', 'user_id');
    const studentHandlers = createCRUDHandlers('Student', 'students_view', 'studentsData', 'user_id');
    const classHandlers = createCRUDHandlers('Class', 'classes_view', 'classesData', 'class_id');

    // Specific handlers that don't follow the generic pattern
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

    return {
        handleSaveData,
        handleMultiSaveData,
        handleTeacherAction,
        handleStudentQueueApproval,
        handleStudentQueueRejection,
        ...teacherHandlers,
        ...studentHandlers,
        ...classHandlers
    };
};
