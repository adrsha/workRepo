'use client';

import './innerStyles/AdminControl.css';
import './innerStyles/EditableField.css';
import { useState, useEffect, useCallback } from 'react';
import { fetchData, fetchViewData } from '../lib/helpers.js';
import { EditableField } from '../components/EditableField';
import { EditableDate } from '../components/EditableDate';
import { EditableDropdown } from '../components/EditableDropdown';
import { EditableTimeSchedule } from '../components/EditableTimeSchedule';
import { useSession } from 'next-auth/react';

function getCols(array) {
  if (!array || array.length === 0) return [];
  const commonKeys = array.reduce((acc, obj) => {
    return acc.filter(key => Object.hasOwn(obj, key));
  }, Object.keys(array[0]));
  return commonKeys;
}

/**
 * Approves or denies a pending teacher
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

// Format date and time for better readability
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return 'Not set';

  try {
    const date = new Date(dateTimeStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (e) {
    console.error('Date formatting error:', e);
    return dateTimeStr; // Return original string if parsing fails
  }
};


export default function AdminControl({ pendingTeachersData: initialPendingTeachers = [] }) {
  // Use localStorage to persist active tab
  const [activeTab, setActiveTab] = useState(() => {
    // Try to get the saved tab from localStorage
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('adminActiveTab');
      return savedTab !== null ? parseInt(savedTab, 10) : TABS.TEACHERS;
    }
    return TABS.TEACHERS;
  });

  const [studentsQueued, setStudentsQueued] = useState([]);
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
  const [actionInProgress, setActionInProgress] = useState({});

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminActiveTab', activeTab.toString());
    }
  }, [activeTab]);

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        // Only fetch the data needed for the initial view
        const [pendingStudents, users] = await Promise.all([
          fetchData('class_joining_pending', authToken),
          fetchData('users', authToken)
        ]);

        if (isMounted) {
          setStudentsQueued(pendingStudents);
          setUsersData(users);
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
        if (isMounted) {
          setError('Failed to load student queue data. Please try again.');
        }
      }
    };

    loadInitialData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // Memoized helper functions for looking up related data
  const getUserName = useCallback((userId) => {
    return usersData.find((user) => user.user_id == userId)?.user_name || 'Unknown User';
  }, [usersData]);


  const getClassName = useCallback((classId) => {
    const classC = classesData.find((classData) => classData.class_id == classId);
    if (!classC) return 'Unknown Class';

    const courseName = courseData.find((course) => course.course_id == classC.course_id)?.course_name || 'Unknown Course';

    // Format dates for better readability
    const startFormatted = formatDateTime(classC.start_time);
    const endFormatted = formatDateTime(classC.end_time);

    return `${courseName} - ${getUserName(classC.teacher_id)} from ${startFormatted} to ${endFormatted}`;
  }, [classesData, courseData, getUserName]);

  // Add new function to handle saving edited data
  // Modify handleSaveData to use the new API
  const handleSaveData = useCallback(
    async (table, id, column, value) => {
      if (!session) {
        console.error('No session found');
        return;
      }

      // Set loading state for this specific item
      setActionInProgress(prev => ({ ...prev, [`${table}-${id}-${column}`]: true }));

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
            prevData.map((item) => (item.user_id === id ? { ...item, [column]: value } : item))
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
        } else if (table === 'users') {
          setUsersData((prevData) =>
            prevData.map((item) => (item.user_id === id ? { ...item, [column]: value } : item))
          );
        }

        console.log(`Updated ${table}:`, result);
      } catch (error) {
        console.error(`Error updating ${table}:`, error);
        alert(`Failed to update ${table}: ${error.message}`);
      } finally {
        // Clear loading state
        setActionInProgress(prev => {
          const newState = { ...prev };
          delete newState[`${table}-${id}-${column}`];
          return newState;
        });
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

      // Generate a unique key for this multi-save operation
      const operationKey = `${table}-${id}-multi`;
      setActionInProgress(prev => ({ ...prev, [operationKey]: true }));

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
            prevData.map((item) => (item.user_id === id ? { ...item, ...updates } : item))
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
        alert(`Failed to update ${table}: ${error.message}`);
      } finally {
        // Clear loading state
        setActionInProgress(prev => {
          const newState = { ...prev };
          delete newState[operationKey];
          return newState;
        });
      }
    },
    [session]
  );


  // Improved student queue handling with proper state updates
  const handleStudentQueueRejection = useCallback(async (pendingId) => {
    // Set loading state for this action
    setActionInProgress(prev => ({ ...prev, [`student-reject-${pendingId}`]: true }));

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

      // Update local state to remove this student from queue
      setStudentsQueued(prev => prev.filter(student => student.pending_id !== pendingId));

      // Refresh session data if needed
      update();
    } catch (error) {
      console.error('Error:', error);
      alert(`Failed to reject student: ${error.message}`);
    } finally {
      // Clear loading state
      setActionInProgress(prev => {
        const newState = { ...prev };
        delete newState[`student-reject-${pendingId}`];
        return newState;
      });
    }
  }, [update]);


  const handleStudentQueueApproval = useCallback(async (classId, userId, pendingId) => {
    // Set loading state for this action
    setActionInProgress(prev => ({ ...prev, [`student-approve-${pendingId}`]: true }));

    try {
      const response = await fetch('/api/acceptPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: classId,
          userId: userId,
          pendingId: pendingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve student');
      }

      // Update local state to remove this student from queue
      setStudentsQueued(prev => prev.filter(student => student.pending_id !== pendingId));

      // Refresh students data
      const authToken = localStorage.getItem('authToken');
      const updatedStudents = await fetchViewData('students_view');
      setStudentsData(updatedStudents);

      // Refresh session data
      update();
    } catch (error) {
      console.error('Error:', error);
      alert(`Failed to approve student: ${error.message}`);
    } finally {
      // Clear loading state
      setActionInProgress(prev => {
        const newState = { ...prev };
        delete newState[`student-approve-${pendingId}`];
        return newState;
      });
    }
  }, [update]);


  // Lazy-loading data based on active tab
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    let isMounted = true;

    const loadTabData = async () => {
      setIsLoading(true);
      try {
        // Load data based on which tab is active
        switch (activeTab) {
          case TABS.TEACHERS:
            if (teachersData.length === 0) {
              const teachers = await fetchViewData('teachers_view');
              if (isMounted) setTeachersData(teachers);
            }
            const [pendingTeachers] = await Promise.all([
              fetchViewData('pending_teachers_view', authToken)
            ]);
            setPendingTeachersData(pendingTeachers);

            break;

          case TABS.CLASSES:
            if (classesData.length === 0 || courseData.length === 0 || gradesData.length === 0) {
              const [classes, courses, grades, teachers] = await Promise.all([
                fetchData('classes', authToken),
                fetchData('courses', authToken),
                fetchData('grades', authToken),
                fetchViewData('teachers_view', authToken)
              ]);
              if (isMounted) {
                setClassesData(classes);
                setCourseData(courses);
                setGradesData(grades);
                setTeachersData(teachers);
              }
            }
            break;

          case TABS.STUDENTS:
            if (studentsData.length === 0) {
              const [classes, courses, students, studentsQueue] = await Promise.all([
                fetchData('classes', authToken),
                fetchData('courses', authToken),
                fetchViewData('students_view'),
                fetchData('class_joining_pending', authToken)
              ]);

              if (isMounted) {
                setClassesData(classes);
                setCourseData(courses);
                setStudentsData(students);
                setStudentsQueued(studentsQueue);
              }
            }
            break;
        }

        if (isMounted) {
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching tab data:', err);
        if (isMounted) {
          setError(`Failed to load ${activeTab === TABS.TEACHERS ? 'teachers' :
            activeTab === TABS.CLASSES ? 'classes' : 'students'} data.`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTabData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [activeTab, teachersData.length, classesData.length, courseData.length, gradesData.length, studentsData.length]);


  // Handle teacher approval/denial with optimistic UI update
  const handleTeacherAction = useCallback(async (pendingId, approved) => {
    // Set loading state for this action
    setActionInProgress(prev => ({ ...prev, [`teacher-${approved ? 'approve' : 'deny'}-${pendingId}`]: true }));

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
      alert(`Failed to ${approved ? 'approve' : 'deny'} teacher: ${error.message}`);
    } finally {
      // Clear loading state
      setActionInProgress(prev => {
        const newState = { ...prev };
        delete newState[`teacher-${approved ? 'approve' : 'deny'}-${pendingId}`];
        return newState;
      });
    }
  }, []);

  // Memoized callback functions for field changes
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

  const handleScheduleChange = useCallback(
    (classId, startTime, endTime) => {
      handleMultiSaveData('classes', classId, {
        start_time: startTime,
        end_time: endTime,
      });
    },
    [handleMultiSaveData]
  );

  // Render loading state with info about what's loading
  if (isLoading) {
    return (
      <div className="loading-spinner">
        Loading {activeTab === TABS.TEACHERS ? 'teachers' :
          activeTab === TABS.CLASSES ? 'classes' : 'students'} data...
      </div>
    );
  }

  // Render error state with specific error message
  if (error) {
    return (
      <div className="error-message">
        {error}
        <button onClick={() => setIsLoading(true)}>Retry</button>
      </div>
    );
  }


  // Format column labels to be more readable
  const formatColName = (colName) => {
    return colName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  };



  const renderTeachersTab = () => (
    <>
      <section className="teachers-section ">
        <h3 className="headers">Pending Teachers</h3>
        {pendingTeachersData.length > 0 ? (
          <table className="teachers-table">
            <thead>
              <tr>
                {getCols(pendingTeachersData).map(col => <th key={col}>{formatColName(col)}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingTeachersData.map((teacher) => (
                <tr key={`pending-${teacher.pending_id}`}>
                  {getCols(pendingTeachersData).map(col => (
                    <td key={`${teacher.pending_id}-${col}`}>{teacher[col]}</td>
                  ))}
                  <td>
                    <button
                      className="approve-btn"
                      onClick={() => handleTeacherAction(teacher.pending_id, true)}
                      disabled={actionInProgress[`teacher-approve-${teacher.pending_id}`]}>
                      {actionInProgress[`teacher-approve-${teacher.pending_id}`] ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      className="deny-btn"
                      onClick={() => handleTeacherAction(teacher.pending_id, false)}
                      disabled={actionInProgress[`teacher-deny-${teacher.pending_id}`]}>
                      {actionInProgress[`teacher-deny-${teacher.pending_id}`] ? 'Processing...' : 'Deny'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No pending teacher applications</div>
        )}
      </section>

      <section className="teachers-section scrollable">
        {teachersData.length > 0 ? (
          <table className="teachers-table">
            <thead>
              <tr>
                {getCols(teachersData).map(col => <th key={col}> {formatColName(col)} </th>)}
              </tr>
            </thead>
            <tbody>
              {teachersData.map((teacher, index) => (
                <tr key={`teacher-${teacher.user_id || index}`}>
                  {getCols(teachersData).map(col => (
                    <td key={`${index}-${col}`}>
                      <EditableField
                        initialValue={teacher[col] || ''}
                        onSave={(value) => {
                          // Determine which table to save to based on column name
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

  // Replace renderClassesTab with table-based layout
  const renderClassesTab = () => {
    // Function to get column names from data
    const getCols = (data) => {
      if (data.length === 0) return [];
      console.log(classesData, teachersData)
      // Define columns and their corresponding components/handlers
      const columns = [
        {
          key: 'class_description',
          title: 'Description',
          component: (classData) => (
            <EditableField
              initialValue={classData.class_description || 'No description'}
              onSave={(value) =>
                handleSaveData('classes', classData.class_id, 'class_description', value)
              }
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
              onSave={(value) => handleTeacherChange(classData.class_id, value)}
              label="Teacher"
              options={teachersData.map((teacher) => ({
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
              onSave={(value) => handleCoursesChange(classData.class_id, value)}
              label="Course"
              options={courseData.map((course) => ({
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
              onSave={(value) => handleGradesChange(classData.class_id, value)}
              label="Grade"
              options={gradesData.map((grade) => ({
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
              onSave={(startTime, endTime) =>
                handleScheduleChange(classData.class_id, startTime, endTime)
              }
              label="Schedule"
            />
          )
        }
      ];

      return columns;
    };


    return (
      <section className="classes-section scrollable">
        <h3 className="headers">Approved Classes</h3>
        {classesData.length > 0 ? (
          <table className="classes-table">
            <thead>
              <tr>
                {getCols(classesData).map(col => <th key={col.key}>{col.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {classesData.map((classData) => (
                <tr key={`class-${classData.class_id}`}>
                  {getCols(classesData).map(col => (
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

  const renderStudentsTab = () => (
    <section className="students-section scrollable">
      <h3 className="headers">Queued Students</h3>
      {studentsQueued.length > 0 ? (
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
            {studentsQueued.map((student, index) => (
              <tr key={`student-${student.pending_id || index}`}>
                {console.log(student)}
                <td>{getUserName(student.user_id)}</td>
                <td><img src={student.screenshot_path} alt="screenshot" className="payment-proof-img" /></td>
                <td>{getClassName(student.class_id)}</td>
                <td>
                  <button
                    className="approve-btn"
                    onClick={() => handleStudentQueueApproval(student.class_id, student.user_id, student.pending_id)}
                    disabled={actionInProgress[`student-approve-${student.pending_id}`]}>
                    {actionInProgress[`student-approve-${student.pending_id}`] ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    className="deny-btn"
                    onClick={() => handleStudentQueueRejection(student.pending_id)}
                    disabled={actionInProgress[`student-reject-${student.pending_id}`]}>
                    {actionInProgress[`student-reject-${student.pending_id}`] ? 'Processing...' : 'Deny'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">No students in queue</div>
      )}

      <h3 className="headers">All Students</h3>
      {studentsData.length > 0 ? (
        <table className="students-table">
          <thead>
            <tr>
              {getCols(studentsData).map(col => <th key={col}>{formatColName(col)}</th>)}
            </tr>
          </thead>
          <tbody>
            {studentsData.map((student, index) => (
              <tr key={`student-${student.user_id || index}`}>
                {getCols(studentsData).map(col =>
                  (col == "user_id") ? (
                    <td key={`${index}-${col}`}>
                      {student[col]}
                    </td>
                  ) : (col == "date_of_birth") ? (
                    <td key={`${index}-${col}`}>
                      <EditableDate
                        initialDate={(student[col]).split('T')[0] || ''}
                        onSave={(value) => handleSaveData('students', student.user_id, col, value + student[col].split('T')[1])}
                        label={formatColName(col)}
                      />
                    </td>
                  ) :
                    <td key={`${index}-${col}`}>
                      <EditableField
                        initialValue={student[col] || ''}
                        onSave={(value) => handleSaveData('students', student.user_id, col, value)}
                        label={formatColName(col)}
                        placeholder={`Enter ${formatColName(col).toLowerCase()}`}
                      />
                    </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
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
