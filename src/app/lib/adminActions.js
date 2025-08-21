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
            'Content-Type': undefined,
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

export const postData = async (table, data) => {
    return makeAuthenticatedRequest('/api/changeData', {
        method: 'POST',
        body: JSON.stringify({ table, data }),
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

// Generic action wrapper
const withActionTracking = async (actionKey, operation, { startAction, endAction }) => {
    startAction(actionKey);
    try {
        return await operation();
    } catch (error) {
        console.error(`Error in ${actionKey}:`, error);
        throw error;
    } finally {
        endAction(actionKey);
    }
};

// Entity configurations - aligned for easy vim block editing
const ENTITY_CONFIGS = {
    Teacher: { viewName: 'teachers_view', stateKey: 'teachersData',    idField: 'user_id'  },
    Student: { viewName: 'students_view', stateKey: 'studentsData',    idField: 'user_id'  },
    Class:   { viewName: 'classes_view',  stateKey: 'classesData',     idField: 'class_id' },
    Grades:  { viewName: 'grades_view',   stateKey: 'gradesData',      idField: 'grade_id' },
    Course:  { viewName: 'courses',       stateKey: 'courseData',      idField: 'course_id'},
    Grade:   { viewName: 'grades',        stateKey: 'gradesData',      idField: 'grade_id' },
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
    
        return withActionTracking(`${table}-${id}-${column}`, async () => {
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
        }, actionHelpers);
    };

    // Helper function to determine target table and ID
    const getTargetTableAndId = async (table, id, column) => {
        if (table === 'teachers' || table === 'students') {
            const usersSchema   = await getSchema('users');
            const targetSchema  = await getSchema(table);

            if (usersSchema.columns.includes(column) && !targetSchema.columns.includes(column)) {
                return { targetTable: 'users', targetId: id };
            }
        }
        return { targetTable: table, targetId: id };
    };

    const handleMultiSaveData = async (table, id, updates) => {
        if (!session) return;

        return withActionTracking(`${table}-${id}-multi`, async () => {
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
        }, actionHelpers);
    };

    // Generic entity operation creator
    const createEntityOperation = (operationType, entityType, config) => {
        const { viewName, stateKey, idField } = config;
        const entityTypeLower = entityType.toLowerCase();

        switch (operationType) {
            case 'add':
                return async (entityData) => {
                    return withActionTracking(`add-${entityTypeLower}`, async () => {
                        await createEntityData(viewName, entityData);
                        const updatedData = await fetchViewData(viewName);
                        updateState({ [stateKey]: updatedData });
                    }, actionHelpers);
                };

            case 'delete':
                return async (entityId) => {
                    return withActionTracking(`delete-${entityTypeLower}-${entityId}`, async () => {
                        await deleteEntityData(viewName, entityId);
                        updateArrayState(stateKey, data =>
                            data.filter(item => item[idField] !== entityId)
                        );
                    }, actionHelpers);
                };

            case 'bulkAdd':
                return async (entitiesData) => {
                    return withActionTracking(`bulk-add-${entityTypeLower}s`, async () => {
                        await bulkCreateData(viewName, entitiesData);
                        const updatedData = await fetchViewData(viewName);
                        updateState({ [stateKey]: updatedData });
                    }, actionHelpers);
                };

            case 'addDirect':
                return async (entityData) => {
                    return withActionTracking(`add-${entityTypeLower}`, async () => {
                        const result = await postData(viewName, entityData);
                        updateArrayState(stateKey, items => [...items, { ...entityData, [idField]: result.insertId }]);
                        console.log(`${entityType} added successfully`);
                    }, actionHelpers);
                };

            case 'deleteDirect':
                return async (entityId) => {
                    return withActionTracking(`delete-${entityTypeLower}-${entityId}`, async () => {
                        await deleteData(viewName, entityId);
                        updateArrayState(stateKey, items =>
                            items.filter(item => item[idField] !== entityId)
                        );
                        console.log(`${entityType} deleted successfully`);
                    }, actionHelpers);
                };

            case 'bulkAddDirect':
                return async (entitiesData) => {
                    return withActionTracking(`bulk-add-${entityTypeLower}s`, async () => {
                        await bulkCreateData(viewName, entitiesData);
                        const updatedData = await fetchViewData(viewName);
                        updateState({ [stateKey]: updatedData });
                        console.log(`${entitiesData.length} ${entityTypeLower}s added successfully`);
                    }, actionHelpers);
                };
        }
    };

    // Generate handlers dynamically
    const generateHandlers = () => {
        const handlers = {};

        // Generate standard CRUD handlers for view-based entities
        ['Teacher', 'Student', 'Class', 'Grades'].forEach(entityType => {
            const config = ENTITY_CONFIGS[entityType];
            handlers[`handleAdd${entityType}`]     = createEntityOperation('add', entityType, config);
            handlers[`handleDelete${entityType}`]  = createEntityOperation('delete', entityType, config);
            handlers[`handleBulkAdd${entityType}`] = createEntityOperation('bulkAdd', entityType, config);
        });

        // Generate direct table handlers for Course and Grade
        ['Course', 'Grade'].forEach(entityType => {
            const config = ENTITY_CONFIGS[entityType];
            handlers[`handleAdd${entityType}`]     = createEntityOperation('addDirect', entityType, config);
            handlers[`handleDelete${entityType}`]  = createEntityOperation('deleteDirect', entityType, config);
            handlers[`handleBulkAdd${entityType}`] = createEntityOperation('bulkAddDirect', entityType, config);
        });

        return handlers;
    };

    // Specific handlers that don't follow the generic pattern
    const handleTeacherAction = async (pendingId, approved) => {
        const actionType = approved ? 'approve' : 'deny';
        return withActionTracking(`teacher-${actionType}-${pendingId}`, async () => {
            await pendingTeachers(pendingId, approved);
            updateArrayState('pendingTeachersData', data =>
                data.filter(teacher => teacher.pending_id !== pendingId)
            );
            if (approved) {
                const updatedTeachers = await fetchViewData('teachers_view');
                updateState({ teachersData: updatedTeachers });
            }
        }, actionHelpers);
    };

    const handleStudentQueueAction = async (action, pendingId, classId = null, userId = null) => {
        const isApproval = action === 'approve';
        const endpoint   = isApproval ? '/api/acceptPayment' : '/api/rejectPayment';
        const actionKey  = `student-${action}-${pendingId}`;
        const payload    = isApproval ? { classId, userId, pendingId } : { pendingId };

        return withActionTracking(actionKey, async () => {
            await processStudentAction(endpoint, payload);
            updateArrayState('studentsQueued', data =>
                data.filter(student => student.pending_id !== pendingId)
            );
            if (isApproval) {
                const updatedStudents = await fetchViewData('students_view');
                updateState({ studentsData: updatedStudents });
            }
            update();
        }, actionHelpers);
    };

    const handleStudentQueueApproval = async (classId, userId, pendingId) => {
        return handleStudentQueueAction('approve', pendingId, classId, userId);
    };

    const handleStudentQueueRejection = async (pendingId) => {
        return handleStudentQueueAction('reject', pendingId);
    };

    return {
        handleSaveData,
        handleMultiSaveData,
        handleTeacherAction,
        handleStudentQueueApproval,
        handleStudentQueueRejection,
        ...generateHandlers()
    };
};
