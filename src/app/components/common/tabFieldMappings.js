// tabFieldMappings.js
import { useState } from 'react';
import { createOptions } from './fieldRendererFactory';

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

    repeat_every_n_day:  (item, onSave, config, deps, renderers) => 
        renderers.repeat(item.repeat_every_n_day, onSave, config),
        
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
        {
            return renderers.date(item.date_of_birth, onSave, config)
        },

};

export const gradesFieldMappings = {
    grade_name: (item, onSave, config, deps, renderers) => 
        renderers.text(item.grade_name, onSave, {
            ...config,
            placeholder: "Enter grade name"
        }),

    grade_type: (item, onSave, config, deps, renderers) => 
        renderers.dropdown(item.grade_type, onSave, {
            ...config,
            options: [
                { value: 'normal', label: 'Normal' },
                { value: 'preparation', label: 'Preparation' },
                { value: 'language classes', label: 'Language Classes' },
                { value: 'other classes', label: 'Other Classes' }
            ],
            placeholder: "Select grade type"
        })
};

export const coursesFieldMappings = {
    course_name: (item, onSave, config, deps, renderers) => 
        renderers.text(item.course_name, onSave, {
            ...config,
            placeholder: "Enter course name"
        }),

    course_details: (item, onSave, config, deps, renderers) => 
        renderers.textarea(item.course_details, onSave, {
            ...config,
            placeholder: "Enter course details"
        }),
};

