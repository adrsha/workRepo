'use client';

import './innerStyles/AdminControl.css';
import { useState, useEffect, useCallback } from 'react';
import { fetchData, fetchViewData } from '../lib/helpers.js';
import { EditableField } from '../components/EditableField';
import { useSession } from 'next-auth/react';

/**
 * Approves or denies a pending teacher
 * @param {string|number} pendingId - ID of the pending teacher
 * @param {boolean} approved - Whether to approve (true) or deny (false)
 * @returns {Promise<Object>} - Response data
 */
async function actionTeacher(pendingId, approved = true) {
  const authToken = localStorage.getItem('authToken');

  try {
    const response = await fetch('/api/pendingTeachers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        pendingId,
        approved,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to ${approved ? 'approve' : 'deny'} teacher (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Teacher action error:', error);
    throw error;
  }
}


// Navigation tab options
const TABS = {
  TEACHERS: 0,
  CLASSES: 1,
  STUDENTS: 2,
};

const EditableDropdown = ({ initialValue, onSave, label, options, placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  // Add useEffect to synchronize the component with updated props
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);


  const handleSave = () => {
    onSave(value);
    setIsEditing(false);
  };

  // Find the matching option to display the label
  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder || 'Click to edit';

  return (
    <div className="editable-field">
      <label>{label}</label>
      {isEditing ? (
        <div className="edit-controls">
          <select value={value || ''} onChange={(e) => setValue(e.target.value)}>
            <option value="" disabled>
              {placeholder || 'Select an option'}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div className="display-value" onClick={() => setIsEditing(true)}>
          {displayText}
          <span className="edit-icon">✏️</span>
        </div>
      )}
    </div>
  );
};

// New component for time selection
const EditableTimeSchedule = ({ initialStartTime, initialEndTime, onSave, label }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [startTime, setStartTime] = useState(initialStartTime || '');
  const [endTime, setEndTime] = useState(initialEndTime || '');

  const handleSave = () => {
    onSave(startTime, endTime);
    setIsEditing(false);
  };

  // Format the display time
  const formatTimeDisplay = (start, end) => {
    if (!start && !end) return 'No schedule set';
    if (!start) return `End: ${end}`;
    if (!end) return `Start: ${start}`;
    return `${start} to ${end}`;
  };

  return (
    <div className="editable-field">
      <label>{label}</label>
      {isEditing ? (
        <div className="edit-controls time-controls">
          <div className="time-inputs">
            <div className="time-input-group">
              <label>Start Time:</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="time-input-group">
              <label>End Time:</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="button-group">
            <button onClick={handleSave}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="display-value" onClick={() => setIsEditing(true)}>
          {formatTimeDisplay(startTime, endTime)}
          <span className="edit-icon">✏️</span>
        </div>
      )}
    </div>
  );
};

export default function AdminControl({ pendingTeachersData: initialPendingTeachers = [] }) {
  const [studentsQueued, setStudentsQueued] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS.TEACHERS);
  const [classesData, setClassesData] = useState([]);
  const [teachersData, setTeachersData] = useState([]);
  const [courseData, setCourseData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [gradesData, setGradesData] = useState([]);
  const [pendingTeachersData, setPendingTeachersData] = useState(initialPendingTeachers);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usersData, setUsersData] = useState([]);
  const { data: session, update } = useSession();


  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    fetchData('class_joining_pending', authToken).then((data) => setStudentsQueued(data));
    fetchData('users', authToken).then((data) => setUsersData(data));
  }, []);

  const getUserName = (userId) => {
    return usersData.find((user) => user.user_id == userId)?.user_name;
  };

  const getClassName = (classId) => {
    console.log("ClassesData: ", classesData);
    const classC = classesData.find((classData) => classData.class_id == classId);
    const courseName = courseData.find((course) => course.course_id == classC.course_id)?.course_name;
    return `${courseName} - ${getUserName(classC.teacher_id)}`;
  };
  // Add new function to handle saving edited data
  // Modify handleSaveData to use the new API
  const handleSaveData = useCallback(
    async (table, id, column, value) => {
      if (!session) {
        console.error('No session found');
        return;
      }

      try {
        const response = await fetch('/api/changeData', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: table,
            id: id,
            updates: { [column]: value },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to update ${table}`);
        }

        const result = await response.json();

        // Update local state based on the type of data being edited
        if (table === 'classes') {
          setClassesData((prevData) =>
            prevData.map((item) => (item.class_id === id ? { ...item, [column]: value } : item))
          );
        } else if (table === 'students') {
          setStudentsData((prevData) =>
            prevData.map((item) => (item.studentId === id ? { ...item, [column]: value } : item))
          );
        } else if (table === 'teachers') {
          setTeachersData((prevData) =>
            prevData.map((item) => (item.user_id === id ? { ...item, [column]: value } : item))
          );
        } else if (table === 'courses') {
          setCourseData((prevData) =>
            prevData.map((item) => (item.course_id === id ? { ...item, [column]: value } : item))
          );
        } else if (table === 'grades') {
          setGradesData((prevData) =>
            prevData.map((item) => (item.grade_id === id ? { ...item, [column]: value } : item))
          );
        }

        console.log(`Updated ${table}:`, result);
      } catch (error) {
        console.error(`Error updating ${table}:`, error);
        throw error;
      }
    },
    [session]
  );

  // Handle saving multiple fields at once
  const handleMultiSaveData = useCallback(
    async (table, id, updates) => {
      if (!session) {
        console.error('No session found');
        return;
      }

      try {
        const response = await fetch('/api/changeData', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: table,
            id: id,
            updates: updates,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to update ${table}`);
        }

        const result = await response.json();

        // Update local state based on the type of data being edited
        if (table === 'classes') {
          setClassesData((prevData) =>
            prevData.map((item) => (item.class_id === id ? { ...item, ...updates } : item))
          );
        } else if (table === 'students') {
          setStudentsData((prevData) =>
            prevData.map((item) => (item.studentId === id ? { ...item, ...updates } : item))
          );
        } else if (table === 'teachers') {
          setTeachersData((prevData) =>
            prevData.map((item) => (item.user_id === id ? { ...item, ...updates } : item))
          );
        } else if (table === 'courses') {
          setCourseData((prevData) =>
            prevData.map((item) => (item.course_id === id ? { ...item, ...updates } : item))
          );
        } else if (table === 'grades') {
          setGradesData((prevData) =>
            prevData.map((item) => (item.grade_id === id ? { ...item, ...updates } : item))
          );
        }

        console.log(`Updated ${table}:`, result);
      } catch (error) {
        console.error(`Error updating ${table}:`, error);
        throw error;
      }
    },
    [session]
  );
  async function handleStudentQueueRejection(pendingId) {
    try {
      const response = await fetch('/api/rejectPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pendingId: pendingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject student');
      }

      console.log('Data:', data);
      update();
    } catch (error) {
      console.error('Error:', error);
      // Handle error (show message to user, etc.)
    }
  }

  async function handleStudentQueueApproval(classId, userId) {
    try {
      const response = await fetch('/api/acceptPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: classId,
          userId: userId,  // Changed from paymentId to userId to match API expectation
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve student');
      }

      console.log('Data:', data);
      update();
    } catch (error) {
      console.error('Error:', error);
      // Handle error (show message to user, etc.)
    }
  }

  // Fetch all necessary data on component mount
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    setIsLoading(true);

    Promise.all([
      fetchData('classes', authToken),
      fetchViewData('teachers_view'),
      fetchViewData('students_view'),
      fetchData('courses', authToken),
      fetchData('grades', authToken),
    ])
      .then(([classes, teachers, students, courses, grades]) => {
        setClassesData(classes);
        setTeachersData(teachers);
        setStudentsData(students);
        setCourseData(courses);
        setGradesData(grades);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Handle teacher approval/denial with optimistic UI update
  const handleTeacherAction = useCallback(async (pendingId, approved) => {
    try {
      await actionTeacher(pendingId, approved);

      // If action was successful, remove from pending list
      setPendingTeachersData((prevData) => prevData.filter((teacher) => teacher.pending_id !== pendingId));

      // If approving, fetch updated teacher data
      if (approved) {
        const updatedTeachers = await fetchViewData('teachers_view');
        setTeachersData(updatedTeachers);
      }
    } catch (error) {
      console.error('Failed to process teacher action:', error);
      alert(`Failed to ${approved ? 'approve' : 'deny'} teacher. Please try again.`);
    }
  }, []);

  // Handle teacher change for a class
  const handleTeacherChange = useCallback(
    (classId, teacherId) => {
      handleSaveData('classes', classId, 'teacher_id', teacherId);
    },
    [handleSaveData]
  );

  const handleCoursesChange = useCallback(
    (classId, courseId) => {
      handleSaveData('classes', classId, 'course_id', courseId);
    },
    [handleSaveData]
  );
  const handleGradesChange = useCallback(
    (classId, gradeId) => {
      handleSaveData('classes', classId, 'grade_id', gradeId);
    },
    [handleSaveData]
  );
  // Handle schedule change
  const handleScheduleChange = useCallback(
    (classId, startTime, endTime) => {
      handleMultiSaveData('classes', classId, {
        start_time: startTime,
        end_time: endTime,
      });
    },
    [handleMultiSaveData]
  );

  // Render loading state
  if (isLoading) {
    return <div className="loading-spinner">Loading data...</div>;
  }

  // Render error state
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // Render Teachers Tab Content
  const renderTeachersTab = () => (
    <>
      <section className="teachers-section">
        <h3 className="headers">Pending Teachers</h3>
        {pendingTeachersData.length > 0 ? (
          <div className="teachers-grid">
            {pendingTeachersData.map((teacher) => (
              <div className="teacher-card" key={`pending-${teacher.pending_id}`}>
                <h2 className="teacher-name">
                  {teacher.user_name}
                  <span className="time">{teacher.expires_at}</span>
                </h2>
                <div className="teacher-details">
                  <p>
                    <strong>Qualification:</strong> {teacher.qualification}
                  </p>
                  <p>
                    <strong>Experience:</strong> {teacher.experience}
                  </p>
                </div>
                <div className="teacher-actions">
                  <button
                    className="approve-btn"
                    onClick={() => handleTeacherAction(teacher.pending_id, true)}>
                    Approve
                  </button>
                  <button
                    className="deny-btn"
                    onClick={() => handleTeacherAction(teacher.pending_id, false)}>
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No pending teacher applications</div>
        )}
      </section>

      <section className="teachers-section">
        <h3 className="headers">Approved Teachers</h3>
        {teachersData.length > 0 ? (
          <div className="teachers-grid">
            {teachersData.map((teacher, index) => (
              <div className="teacher-card" key={`teacher-${teacher.user_id || index}`}>
                <EditableField
                  initialValue={teacher.user_name}
                  onSave={(value) => handleSaveData('users', teacher.user_id, 'user_name', value)}
                  label="Teacher Name"
                  placeholder="Enter teacher name"
                />
                <div className="teacher-details">
                  <EditableField
                    initialValue={teacher.qualification || ''}
                    onSave={(value) =>
                      handleSaveData('teachers', teacher.user_id, 'qualification', value)
                    }
                    label="Qualification"
                    placeholder="Enter qualification"
                  />
                  <EditableField
                    initialValue={teacher.experience || ''}
                    onSave={(value) =>
                      handleSaveData('teachers', teacher.user_id, 'experience', value)
                    }
                    label="Experience"
                    placeholder="Enter experience"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No approved teachers</div>
        )}
      </section>
    </>
  );

  // Modified renderClassesTab to include time selectors
  const renderClassesTab = () => (
    <section className="classes-section">
      <h3 className="headers">Approved Classes</h3>
      {classesData.length > 0 ? (
        <div className="classes-grid">
          {classesData.map((classData) => (
            <div className="class-card" key={`class-${classData.class_id}`}>
              <EditableField
                initialValue={classData.class_description || 'No description'}
                onSave={(value) =>
                  handleSaveData('classes', classData.class_id, 'class_description', value)
                }
                label="Class Description"
                placeholder="Enter class description"
              />
              <div className="class-details">
                <EditableDropdown
                  initialValue={classData.teacher_id}
                  onSave={(value) => handleTeacherChange(classData.class_id, value)}
                  label="Teacher"
                  options={teachersData.map((teacher) => ({
                    value: teacher.user_id,
                    label: teacher.user_name,
                  }))}
                  placeholder="Select a teacher"
                />

                <EditableDropdown
                  initialValue={classData.course_id}
                  onSave={(value) => handleCoursesChange(classData.class_id, value)}
                  label="Course"
                  options={courseData.map((course) => ({
                    value: course.course_id,
                    label: course.course_name,
                  }))}
                  placeholder="Select a course"
                />
                <EditableDropdown
                  initialValue={classData.grade_id}
                  onSave={(value) => handleGradesChange(classData.class_id, value)}
                  label="Grade"
                  options={gradesData.map((grade) => ({
                    value: grade.grade_id,
                    label: grade.grade_name,
                  }))}
                  placeholder="Select a grade"
                />
                <EditableTimeSchedule
                  initialStartTime={classData.start_time}
                  initialEndTime={classData.end_time}
                  onSave={(startTime, endTime) =>
                    handleScheduleChange(classData.class_id, startTime, endTime)
                  }
                  label="Schedule"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No classes available</div>
      )}
    </section>
  );

  // Modify renderStudentsTab to include editable fields
  const renderStudentsTab = () => (
    <section className="students-section">
      <h3 className="headers">Queued Students</h3>
      {studentsQueued.length > 0 ? (
        <div className="students-grid">
          {studentsQueued.map((student, index) => (
            <div className="student-card" key={`student-${student.pending_id || index}`}>
              <span className="student-name">{getUserName(student.user_id)}</span>
              <span className="payment-proof"><img src={student.screenshot_path} alt="screenshot" /></span>
              <span className="class-name">for {getClassName(student.class_id)}</span>
              <button className="approve-btn" onClick={() => handleStudentQueueApproval(student.class_id, student.user_id)}>Approve</button>
              <button className="deny-btn" onClick={() => handleStudentQueueRejection(student.pending_id)}>Deny</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No students registered</div>
      )}
      <h3 className="headers">All Students</h3>
      {studentsData.length > 0 ? (
        <div className="students-grid">
          {studentsData.map((student, index) => (
            <div className="student-card" key={`student-${student.studentId || index}`}>
              <EditableField
                initialValue={student.user_name}
                onSave={(value) => handleSaveData('students', student.studentId, 'user_name', value)}
                label="Student Name"
                placeholder="Enter student name"
              />
              {/* Add more editable fields for student details as needed */}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No students registered</div>
      )}
    </section>
  );

  return (
    <div className="admin-panel">
      <nav className="navigation">
        <span
          onClick={() => setActiveTab(TABS.TEACHERS)}
          className={activeTab === TABS.TEACHERS ? 'active' : ''}>
          Teachers
        </span>
        <span onClick={() => setActiveTab(TABS.CLASSES)} className={activeTab === TABS.CLASSES ? 'active' : ''}>
          Classes
        </span>
        <span
          onClick={() => setActiveTab(TABS.STUDENTS)}
          className={activeTab === TABS.STUDENTS ? 'active' : ''}>
          Students
        </span>
      </nav>

      <div className="tab-content">
        {activeTab === TABS.TEACHERS && renderTeachersTab()}
        {activeTab === TABS.CLASSES && renderClassesTab()}
        {activeTab === TABS.STUDENTS && renderStudentsTab()}
      </div>
    </div>
  );
}
