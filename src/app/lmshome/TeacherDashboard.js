import { useState } from 'react';
import Loading from '../components/Loading.js';
import Input from '../components/Input.js';
import { formatDateTime } from '../../utils/dateTime.js';
import { addClass, removeClass } from '../lib/teacherActions';
import { fetchJoinableData } from '../lib/helpers.js';
import { formatRepeatPattern } from '../lib/utils.js';
import { RepeatScheduleInput } from '../components/RepeatTime.js';
import styles from '../../styles/Teacherlms.module.css';

const TeacherDashboard = ({ userData, setUserData, session, update, router, setIsLoading, isLoading }) => {
    const { classesData, courseData, gradeData } = userData;

    const [addClassOverLayState, setAddClassOverlayState] = useState(false);
    const [addClassError, setAddClassError] = useState('');
    const [showClassDeleters, setShowClassDeleters] = useState(false);

    const handleAddClass = async (e) => {
        e.preventDefault();
        setAddClassError('');
        setIsLoading(true);

        try {
            const formData = extractClassFormData(e.currentTarget);

            validateClassForm(formData);

            const { start, end } = formatDateTimes(formData);
            await addClass(
                formData.courseId,
                start,
                end,
                formData.repeatEveryNDay,
                formData.classDescription,
                formData.grade
            );

            await handleSuccessfulClassAdd();
        } catch (error) {
            setAddClassError(`Failed to add class: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const extractClassFormData = (form) => {
        const formData = new FormData(form);
        return {
            startTime: formData.get('startTime'),
            startDate: formData.get('startDate'),
            endTime: formData.get('endTime'),
            endDate: formData.get('endDate'),
            classDescription: formData.get('classDescription'),
            repeatEveryNDay: formData.get('repeatEveryNDay'),
            grade: parseInt(formData.get('grade')),
            courseId: parseInt(formData.get('course'))
        };
    };

    const validateClassForm = (data) => {
        const required = ['startTime', 'endTime', 'startDate', 'endDate', 'courseId', 'grade', 'repeatEveryNDay'];
        const missing = required.filter(field => !data[field]);

        if (missing.length > 0) {
            throw new Error('Please fill in all required fields');
        }
    };

    const formatDateTimes = ({ startDate, startTime, endDate, endTime }) => {
        const startLocal = new Date(`${startDate}T${startTime}`);
        const endLocal = new Date(`${endDate}T${endTime}`);

        return {
            start: startLocal.toISOString(), 
            end: endLocal.toISOString()
        };
    };

    const handleSuccessfulClassAdd = async () => {
        setAddClassError('');
        await update();
        setAddClassOverlayState(false);
    };


    const handleRemoveClass = async (classId) => {
        setIsLoading(true);
        try {
            await removeClass(classId);
            await update();
            await refreshClassesData();
            setShowClassDeleters(false);
        } catch (error) {
            console.error('Error removing class:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshClassesData = async () => {
        if (!session || session.user.level !== 1) return;

        const data = await fetchJoinableData(
            ['classes', 'courses', 'grades'],
            ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
            '*',
            { 'classes.teacher_id': session.user.id }
        );

        setUserData(prev => ({ ...prev, classesData: data }));
    };

    const renderClassCard = (classData) => (
        <div
            className={`${styles.classCard} ${showClassDeleters ? styles.deleteMode : ''}`}
            key={classData.class_id}
        >
            <div className={styles.classCardContent}>
                <h3 className={styles.classTitle}>
                    {capitalizeFirstLetter(classData.course_name)}
                </h3>
                <div className={styles.classInfo}>
                    <p className={styles.timeInfo}>
                        {formatDateTime(classData.start_time, "short")} - {formatDateTime(classData.end_time, "short")}
                    </p>
                    <p className={styles.gradeInfo}>Grade: {classData.grade_name}</p>
                    <p className={styles.repeatInfo}>
                        {formatRepeatPattern(classData.repeat_every_n_day)}
                    </p>
                </div>
                {classData.class_description && (
                    <p className={styles.classDescription}>{classData.class_description}</p>
                )}
            </div>

            <div className={styles.classActions}>
                <button
                    className={styles.primaryButton}
                    onClick={() => router.push(`/classes/${classData.class_id}`)}>
                    View Class
                </button>
            </div>

            {showClassDeleters && (
                <button
                    className={styles.deleteButton}
                    onClick={() => handleRemoveClass(classData.class_id)}
                    title="Delete this class">
                    ×
                </button>
            )}
        </div>
    );

    const capitalizeFirstLetter = (str) => str[0].toUpperCase() + str.slice(1);

    const renderSectionHeader = () => (
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Classes</h2>
            <div className={styles.actionButtons}>
                <button
                    className={styles.primaryButton}
                    onClick={() => setAddClassOverlayState(true)}>
                    Add Class
                </button>
                <button
                    className={`${styles.secondaryButton} ${showClassDeleters ? styles.activeDeleteMode : ''}`}
                    onClick={() => setShowClassDeleters(!showClassDeleters)}>
                    {showClassDeleters ? 'Cancel' : 'Delete Classes'}
                </button>
            </div>
        </div>
    );

    const renderClassesList = () => {
        if (!classesData) return <Loading />;

        if (classesData.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <p>No classes created yet</p>
                    <p>Click "Add Class" to create your first class.</p>
                </div>
            );
        }

        return (
            <div className={styles.classCards}>
                {classesData.map(renderClassCard)}
            </div>
        );
    };

    const renderAddClassOverlay = () => (
        <div className={styles.overlay}>
            <div className={styles.overlayContent}>
                <div className={styles.overlayHeader}>
                    <h2>Add New Class</h2>
                    <button
                        className={styles.closeButton}
                        onClick={() => setAddClassOverlayState(false)}
                        aria-label="Close">
                        ×
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleAddClass}>
                    <div className={styles.formRow}>
                        <Input
                            label="Course"
                            type="select"
                            name="course"
                            id="course"
                            required
                            data={courseData.map((course) => ({ id: course.course_id, name: course.course_name }))}
                        />
                        <Input
                            label="Grade"
                            type="select"
                            name="grade"
                            id="grade"
                            required
                            data={gradeData.map((grade) => ({ id: grade.grade_id, name: grade.grade_name }))}
                        />
                    </div>

                    <div className={styles.formRow}>
                        <Input label="Start Time" type="time" name="startTime" id="startTime" defaultValue="09:00" required />
                        <Input label="End Time" type="time" name="endTime" id="endTime" defaultValue="10:00" required />
                    </div>

                    <div className={styles.formRow}>
                        <Input label="Start Date" type="date" name="startDate" id="startDate" required />
                        <Input label="End Date" type="date" name="endDate" id="endDate" required />
                    </div>

                    <RepeatScheduleInput />

                    <Input
                        label="Class Description"
                        type="textarea"
                        name="classDescription"
                        id="classDescription"
                        placeholder="Optional description for your class..."
                    />

                    {addClassError && <p className={styles.errorMessage}>{addClassError}</p>}

                    <div className={styles.formActions}>
                        <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                            {isLoading ? 'Adding...' : 'Add Class'}
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => setAddClassOverlayState(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );


    return (
        <div className={styles.content}>
            <div className={styles.classesSection}>
                {renderSectionHeader()}
                {renderClassesList()}
            </div>

            {addClassOverLayState && renderAddClassOverlay()}
        </div>
    );
};

export default TeacherDashboard;
