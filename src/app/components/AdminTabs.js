import { EditableField } from './EditableField';
import { EditableDate } from './EditableDate';
import { EditableDropdown } from './EditableDropdown';
import { EditableTimeSchedule } from './EditableTimeSchedule';
import { getCols, formatColName, formatDateTime } from '../lib/utils';

const renderButton = (text, onClick, disabled, className = '') => (
    <button className={className} onClick={onClick} disabled={disabled} key={className}>
        {disabled ? 'Processing...' : text}
    </button>
);

const renderActionButtons = (item, type, actions, actionInProgress) => (
    <td>
        {actions.map(({ text, action, key }) => 
            renderButton(
                text,
                () => action(item),
                actionInProgress[`${type}-${key}-${item.pending_id || item.user_id}`],
                `${key}-btn`
            )
        )}
    </td>
);

export const TeachersTab = ({ 
    state, 
    actionInProgress, 
    handleTeacherAction, 
    handleSaveData 
}) => (
    <>
        <section className="teachers-section">
            <h3 className="headers">Pending Teachers</h3>
            {state.pendingTeachersData.length > 0 ? (
                <table className="teachers-table">
                    <thead>
                        <tr>
                            {getCols(state.pendingTeachersData).map(col => 
                                <th key={col}>{formatColName(col)}</th>
                            )}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {state.pendingTeachersData.map(teacher => (
                            <tr key={`pending-${teacher.pending_id}`}>
                                {getCols(state.pendingTeachersData).map(col => 
                                    <td key={`${teacher.pending_id}-${col}`}>{teacher[col]}</td>
                                )}
                                {renderActionButtons(teacher, 'teacher', [
                                    { text: 'Approve', action: t => handleTeacherAction(t.pending_id, true), key: 'approve' },
                                    { text: 'Deny', action: t => handleTeacherAction(t.pending_id, false), key: 'deny' }
                                ], actionInProgress)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="empty-state">No pending teacher applications</div>
            )}
        </section>

        <section className="teachers-section scrollable">
            {state.teachersData.length > 0 ? (
                <table className="teachers-table">
                    <thead>
                        <tr>
                            {getCols(state.teachersData).map(col => 
                                <th key={col}>{formatColName(col)}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {state.teachersData.map((teacher, index) => (
                            <tr key={`teacher-${teacher.user_id || index}`}>
                                {getCols(state.teachersData).map(col => (
                                    <td key={`${index}-${col}`}>
                                        <EditableField
                                            initialValue={teacher[col] || ''}
                                            onSave={(value) => {
                                                const tableType = col.startsWith('user_') ? 'users' : 'teachers';
                                                handleSaveData(tableType, teacher.user_id, col, value);
                                            }}
                                            label={formatColName(col)}
                                            placeholder={`Enter ${formatColName(col).toLowerCase()}`}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="empty-state">No approved teachers</div>
            )}
        </section>
    </>
);

export const ClassesTab = ({ 
    state, 
    handleSaveData, 
    handleMultiSaveData 
}) => {
    const handleFieldChange = (field, table = 'classes') => 
        (id, value) => handleSaveData(table, id, field, value);

    const handleScheduleChange = (classId, startTime, endTime) => 
        handleMultiSaveData('classes', classId, { start_time: startTime, end_time: endTime });

    const columns = [
        {
            key: 'class_description',
            title: 'Description',
            component: (classData) => (
                <EditableField
                    initialValue={classData.class_description || 'No description'}
                    onSave={(value) => handleSaveData('classes', classData.class_id, 'class_description', value)}
                    label="Class Description"
                    placeholder="Enter class description"
                />
            )
        },
        {
            key: 'teacher_id',
            title: 'Teacher',
            component: (classData) => (
                <EditableDropdown
                    initialValue={classData.teacher_id}
                    onSave={(value) => handleFieldChange('teacher_id')(classData.class_id, value)}
                    label="Teacher"
                    options={state.teachersData.map(teacher => ({
                        value: teacher.user_id,
                        label: teacher.user_name,
                    }))}
                    placeholder="Select a teacher"
                />
            )
        },
        {
            key: 'course_id',
            title: 'Course',
            component: (classData) => (
                <EditableDropdown
                    initialValue={classData.course_id}
                    onSave={(value) => handleFieldChange('course_id')(classData.class_id, value)}
                    label="Course"
                    options={state.courseData.map(course => ({
                        value: course.course_id,
                        label: course.course_name,
                    }))}
                    placeholder="Select a course"
                />
            )
        },
        {
            key: 'grade_id',
            title: 'Grade',
            component: (classData) => (
                <EditableDropdown
                    initialValue={classData.grade_id}
                    onSave={(value) => handleFieldChange('grade_id')(classData.class_id, value)}
                    label="Grade"
                    options={state.gradesData.map(grade => ({
                        value: grade.grade_id,
                        label: grade.grade_name,
                    }))}
                    placeholder="Select a grade"
                />
            )
        },
        {
            key: 'schedule',
            title: 'Schedule',
            component: (classData) => (
                <EditableTimeSchedule
                    initialStartTime={classData.start_time}
                    initialEndTime={classData.end_time}
                    onSave={(startTime, endTime) => handleScheduleChange(classData.class_id, startTime, endTime)}
                    label="Schedule"
                />
            )
        }
    ];

    return (
        <section className="classes-section scrollable">
            <h3 className="headers">Approved Classes</h3>
            {state.classesData.length > 0 ? (
                <table className="classes-table">
                    <thead>
                        <tr>
                            {columns.map(col => <th key={col.key}>{col.title}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {state.classesData.map(classData => (
                            <tr key={`class-${classData.class_id}`}>
                                {columns.map(col => (
                                    <td key={`${classData.class_id}-${col.key}`}>
                                        {col.component(classData)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="empty-state">No classes available</div>
            )}
        </section>
    );
};

export const StudentsTab = ({ 
    state, 
    actionInProgress,
    handleSaveData,
    handleStudentQueueApproval,
    handleStudentQueueRejection,
    getUserName,
    getClassName
}) => (
    <section className="students-section scrollable">
        <h3 className="headers">Queued Students</h3>
        {state.studentsQueued.length > 0 ? (
            <table className="students-table">
                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>Payment Proof</th>
                        <th>Class</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {state.studentsQueued.map((student, index) => (
                        <tr key={`student-${student.pending_id || index}`}>
                            <td>{getUserName(student.user_id)}</td>
                            <td>
                                <img 
                                    src={student.screenshot_path} 
                                    alt="payment proof" 
                                    className="payment-proof-img" 
                                />
                            </td>
                            <td>{getClassName(student.class_id)}</td>
                            {renderActionButtons(student, 'student', [
                                { 
                                    text: 'Approve', 
                                    action: s => handleStudentQueueApproval(s.class_id, s.user_id, s.pending_id), 
                                    key: 'approve' 
                                },
                                { 
                                    text: 'Deny', 
                                    action: s => handleStudentQueueRejection(s.pending_id), 
                                    key: 'reject' 
                                }
                            ], actionInProgress)}
                        </tr>
                    ))}
                </tbody>
            </table>
        ) : (
            <div className="empty-state">No students in queue</div>
        )}

        <h3 className="headers">All Students</h3>
        {state.studentsData.length > 0 ? (
            <table className="students-table">
                <thead>
                    <tr>
                        {getCols(state.studentsData).map(col => 
                            <th key={col}>{formatColName(col)}</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {state.studentsData.map((student, index) => (
                        <tr key={`student-${student.user_id || index}`}>
                            {getCols(state.studentsData).map(col => {
                                if (col === 'user_id') {
                                    return <td key={`${index}-${col}`}>{student[col]}</td>;
                                }
                                
                                if (col === 'date_of_birth') {
                                    return (
                                        <td key={`${index}-${col}`}>
                                            <EditableDate
                                                initialDate={student[col]?.split('T')[0] || ''}
                                                onSave={(value) => 
                                                    handleSaveData('students', student.user_id, col, 
                                                        value + (student[col]?.split('T')[1] || 'T00:00:00'))
                                                }
                                                label={formatColName(col)}
                                            />
                                        </td>
                                    );
                                }
                                
                                return (
                                    <td key={`${index}-${col}`}>
                                        <EditableField
                                            initialValue={student[col] || ''}
                                            onSave={(value) => handleSaveData('students', student.user_id, col, value)}
                                            label={formatColName(col)}
                                            placeholder={`Enter ${formatColName(col).toLowerCase()}`}
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        ) : (
            <div className="empty-state">No students registered</div>
        )}
    </section>
);
