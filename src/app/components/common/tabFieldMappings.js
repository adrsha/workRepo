// tabFieldMappings.js
import { useState } from 'react';
import { createOptions } from './fieldRendererFactory';

const ExpandableCell = ({ 
    id, 
    count, 
    items, 
    countLabel, 
    renderItem, 
    onItemClick, 
    emptyMessage,
    containerClass,
    itemClass,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={containerClass}>
            <div
                className="count-display clickable"
                onClick={() => setIsExpanded(!isExpanded)}
                title={`Click to view ${countLabel}`}
            >
                <span className="count-badge">
                    {count} {countLabel}{count !== 1 ? 's' : ''}
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                        {isExpanded ? '▼' : '▶'}
                    </span>
                </span>
            </div>

            {isExpanded && (
                <div className="items-list">
                    {items.length > 0 ? (
                        <div className="items-grid">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    className={itemClass}
                                    onClick={(e) => onItemClick(item.id, e)}
                                    title={item.title}
                                >
                                    {renderItem(item)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`no-${countLabel}`}>{emptyMessage}</div>
                    )}
                </div>
            )}
        </div>
    );
};

const TruncatedText = ({ text, maxLength = 50, title }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!text || text.length <= maxLength) {
        return <span>{text || 'Not provided'}</span>;
    }

    const truncated = text.substring(0, maxLength) + '...';

    return (
        <>
            <span 
                className="truncated-text clickable" 
                onClick={() => setIsModalOpen(true)}
                title="Click to view full content"
            >
                {truncated}
            </span>
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{title}</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>{text}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Helper function to handle form mode vs regular mode
const handleFormModeField = (item, onSave, config, deps, renderers, fieldRenderer) => {
    if (item.isFormMode) {
        return fieldRenderer(item, onSave, config, deps, renderers);
    }
    return fieldRenderer(item, onSave, config, deps, renderers);
};

// Classes tab field mappings
export const classesFieldMappings = {
    teacher_id: (item, onSave, config, deps, renderers) => 
        renderers.dropdown(item.teacher_id, onSave, {
            ...config,
            options: createOptions(deps.teachersData, 'user_id', 'user_name'),
            placeholder: "Select a teacher"
        }),

    course_id: (item, onSave, config, deps, renderers) => 
        renderers.dropdown(item.course_id, onSave, {
            ...config,
            options: createOptions(deps.courseData, 'course_id', 'course_name'),
            placeholder: "Select a course"
        }),

    grade_id: (item, onSave, config, deps, renderers) => 
        renderers.dropdown(item.grade_id, onSave, {
            ...config,
            options: createOptions(deps.gradesData, 'grade_id', 'grade_name'),
            placeholder: "Select a grade"
        }),

    start_time: (item, onSave, config, deps, renderers) => 
        renderers.datetime(item.start_time, onSave, config),

    end_time: (item, onSave, config, deps, renderers) => 
        renderers.datetime(item.end_time, onSave, config),

    enrolled_students: (item, onSave, config, deps, renderers) => {
        // In form mode, show a simple text field or display message
        if (item.isFormMode) {
            return renderers.display('Students will be enrolled after class creation', {
                className: "form-info-text",
                fallback: "No students yet"
            });
        }
        
        // Regular mode - show expandable list
        return (
            <ExpandableCell
                id={item.class_id}
                count={item.enrolled_students || 0}
                items={(item.enrolled_students_list || []).map(student => ({
                    id: student.user_id,
                    title: `Click to view ${student.user_name}'s profile`,
                    ...student
                }))}
                countLabel="student"
                renderItem={(student) => (
                    <>
                        <div className="student-name">{student.user_name}</div>
                        {student.contact && <div className="student-contact">{student.contact}</div>}
                        <div className="profile-link-icon">👤</div>
                    </>
                )}
                onItemClick={(userId, e) => {
                    e.stopPropagation();
                    window.open(`/profile/${userId}`, '_blank');
                }}
                emptyMessage="No students enrolled"
                containerClass="enrolled-students-container"
                itemClass="student-item"
            />
        );
    }
};

// Students tab field mappings
export const studentsFieldMappings = {
    grade_id: (item, onSave, config, deps, renderers) => 
        renderers.dropdown(item.grade_id, onSave, {
            ...config,
            options: createOptions(deps.gradesData, 'grade_id', 'grade_name'),
            placeholder: "Select a grade"
        }),

    role_id: (item, onSave, config, deps, renderers) => 
        renderers.dropdown(item.role_id, onSave, {
            ...config,
            options: createOptions(deps.rolesData, 'role_id', 'role_name'),
            placeholder: "Select a role"
        }),
        
    date_of_birth: (item, onSave, config, deps, renderers) => 
        renderers.datetime(item.date_of_birth, onSave, config),

    enrolled_classes: (item, onSave, config, deps, renderers) => {
        // In form mode, show a simple message
        if (item.isFormMode) {
            return renderers.display('Classes will be available after student creation', {
                className: "form-info-text",
                fallback: "No classes yet"
            });
        }
        
        // Regular mode - show expandable list
        return (
            <ExpandableCell
                id={item.user_id}
                count={item.enrolled_classes || 0}
                items={(item.enrolled_classes_list || []).map(classItem => ({
                    id: classItem.class_id,
                    title: `Click to view ${classItem.class_name || 'class'} details`,
                    ...classItem
                }))}
                countLabel="class"
                renderItem={(classItem) => (
                    <>
                        <div className="class-name">
                            {classItem.course_name || classItem.class_name || 'Unknown Class'}
                        </div>
                        {classItem.teacher_name && (
                            <div className="class-teacher">Teacher: {classItem.teacher_name}</div>
                        )}
                        {classItem.start_time && (
                            <div className="class-time">
                                {new Date(classItem.start_time).toLocaleString()}
                            </div>
                        )}
                        <div className="class-link-icon">📚</div>
                    </>
                )}
                onItemClick={(classId, e) => {
                    e.stopPropagation();
                    window.open(`/classes/${classId}`, '_blank');
                }}
                emptyMessage="No classes enrolled"
                containerClass="enrolled-classes-container"
                itemClass="class-item"
            />
        );
    }
};

// Teachers tab field mappings  
export const teachersFieldMappings = {
    certificate_path: (item, onSave, config, deps, renderers) => 
        renderers.image(item.certificate_path, onSave, {
            ...config,
            alt: "certificate",
            className: "certificate-img",
            placeholder: "Enter certificate path"
        }),

    qualification: (item, onSave, config, deps, renderers) => {
        // In form mode, always show editable text field
        if (item.isFormMode) {
            return renderers.text(item.qualification, onSave, {
                ...config,
                placeholder: "Enter qualifications"
            });
        }
        
        // Regular mode - check if it's pending teacher
        return item.pending_id ? (
            <TruncatedText 
                text={item.qualification} 
                title="Qualification Details"
            />
        ) : renderers.text(item.qualification, onSave, {
                ...config,
                placeholder: "Enter qualifications"
            });
    },

    experience: (item, onSave, config, deps, renderers) => {
        // In form mode, always show editable text field
        if (item.isFormMode) {
            return renderers.text(item.experience, onSave, {
                ...config,
                placeholder: "Enter teaching experience"
            });
        }
        
        // Regular mode - check if it's pending teacher
        return item.pending_id ? (
            <TruncatedText 
                text={item.experience} 
                title="Experience Details"
            />
        ) : renderers.text(item.experience, onSave, {
                ...config,
                placeholder: "Enter teaching experience"
            });
    },

    created_at: (item, onSave, config, deps, renderers) => {
        // In form mode, don't show created_at as it doesn't exist yet
        if (item.isFormMode) {
            return renderers.display('Will be set automatically', {
                className: "form-info-text",
                fallback: "Auto-generated"
            });
        }
        
        return renderers.date(item.created_at, onSave, config);
    },

    secret_key: (item, onSave, config, deps, renderers) => {
        // In form mode, show message that it will be generated
        if (item.isFormMode) {
            return renderers.display('Will be generated automatically', {
                className: "form-info-text",
                fallback: "Auto-generated"
            });
        }
        
        return renderers.display(item.secret_key, {
            className: "secret-key-highlight",
            fallback: "Not generated"
        });
    }
};

// Pending teachers specific mappings (restricted editing)
export const pendingTeachersFieldMappings = {
    ...teachersFieldMappings,

    // Override to allow editing only specific fields
    user_name: (item, onSave, config, deps, renderers) => 
        renderers.text(item.user_name, onSave, config),

    user_email: (item, onSave, config, deps, renderers) => 
        renderers.text(item.user_email, onSave, config),

    contact: (item, onSave, config, deps, renderers) => 
        renderers.text(item.contact, onSave, config),

    // Other fields are display-only for pending teachers (unless in form mode)
    user_level: (item, onSave, config, deps, renderers) => {
        if (item.isFormMode) {
            return renderers.text(item.user_level, onSave, {
                ...config,
                placeholder: "Enter user level"
            });
        }
        return renderers.display(item.user_level, {});
    }
};
