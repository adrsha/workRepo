'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import styles from '../../styles/Grades.module.css';
import '../global.css';

import { SEO } from '../seoConfig';
import Loading from '../components/Loading';
import Payer from '../components/Payer';
import {
    fetchData,
    fetchViewData,
    fetchJoinableData,
    fetchDataWhereAttrIs,
    getDate
} from '../lib/helpers';


export default function GradesPage() {
    const router = useRouter();
    const { data: session, status, update } = useSession();

    // State management
    const [gradesData, setGradesData] = useState([]);
    const [activeGradeId, setActiveGradeId] = useState(null);
    const [classesData, setClassesData] = useState(null);
    const [teachersData, setTeachersData] = useState([]);
    const [groupedClassesData, setGroupedClassesData] = useState(null);
    const [classesUserJoined, setClassesUserJoined] = useState([]);
    const [showPayer, setShowPayer] = useState(false);
    // New state for full-screen overlay
    const [showClassroomOverlay, setShowClassroomOverlay] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    // New state for cart functionality
    const [cart, setCart] = useState([]);
    // Add the missing isJoining state
    const [isJoining, setIsJoining] = useState(false);
    // New state for pending class requests
    const [classesPendingApproval, setClassesPendingApproval] = useState([]);
    // New state for teacher's owned classes
    const [teacherOwnedClasses, setTeacherOwnedClasses] = useState([]);
    const [classItem, setClassItem] = useState([]);
    // Get user level (0: student, 1: teacher, 2: admin)
    const getUserLevel = () => {
        return session?.user?.level ?? null;
    };

    // Set the first grade as active when grades data loads
    useEffect(() => {
        if (gradesData.length > 0 && !activeGradeId) {
            setActiveGradeId(gradesData[0]?.grade_id);
        }
    }, [gradesData, activeGradeId]);

    // Fetch initial data: grades and teachers
    useEffect(() => {
        const authToken = localStorage.getItem('authToken');

        // Only fetch grades if not already loaded
        if (!gradesData.length) {
            fetchData('grades', authToken)
                .then(data => {
                    return setGradesData(data)
                })
                .catch(error => console.error('Error fetching grades:', error));
        }

        // Fetch teachers data
        fetchViewData('teachers_view')
            .then(data => setTeachersData(data))
            .catch(error => console.error('Error fetching teachers:', error));
    }, [gradesData.length]);

    // Fetch classes for the active grade
    useEffect(() => {
        if (!activeGradeId) return;

        const authToken = localStorage.getItem('authToken');
        const isAuthenticated = status === 'authenticated';

        fetchJoinableData(
            ['grades', 'classes', 'courses'],
            ['grades.grade_id = classes.grade_id', 'classes.course_id = courses.course_id'],
            '*',
            { 'grades.grade_id': activeGradeId },
            isAuthenticated ? authToken : null
        )
          .then(data => {
            return (
              setClassesData(data),
              setClassItem(prev => [
                ...prev,
                ...data.filter(
                  newItem => !prev.some(existing => existing.class_id === newItem.class_id)
                )
              ])
           )
          })
            .catch(error => console.error('Error fetching classes:', error));

        if (isAuthenticated) {
            const userLevel = getUserLevel();

            // For students (level 0), check joined and pending classes
            if (userLevel === 0) {
                checkUserJoinedClasses();
                checkUserPendingClasses();
            }

            // For teachers (level 1), check owned classes
            if (userLevel === 1) {
                checkTeacherOwnedClasses();
            }

            // For admins (level 2), check all data
            if (userLevel === 2) {
                checkUserJoinedClasses();
                checkUserPendingClasses();
                checkTeacherOwnedClasses();
            }
        }
    }, [activeGradeId, status, session]);

    // Group classes by course when classes data changes
    useEffect(() => {
        if (!classesData) return;

        // Group classes by course name
        const grouped = groupClassesByCourse(classesData);
        setGroupedClassesData(grouped);
    }, [classesData]);

    // Helper function to get teacher by ID
    const getTeacher = (teacherId) => {
        return teachersData?.find(teacher => teacher.user_id === teacherId);
    };

    // Group classes by course for better organization
    const groupClassesByCourse = (classes) => {
        if (!classes || !classes.length) return [];

        const sortedClasses = [...classes].sort((a, b) =>
            a.course_name.localeCompare(b.course_name)
        );

        const grouped = [];
        let courseIndex = 0;
        let prevCourseName = '';

        sortedClasses.forEach(classData => {
            const { course_name, course_details, ...classDetails } = classData;

            if (course_name === prevCourseName) {
                // Add to existing course group
                grouped[grouped.length - 1].classes.push(classDetails);
            } else {
                // Create new course group
                grouped.push({
                    course_id: courseIndex++,
                    course_name,
                    course_description: course_details,
                    classes: [classDetails]
                });
            }

            prevCourseName = course_name;
        });

        return grouped;
    };

    // Check which classes the user has joined (for students and admins)
    const checkUserJoinedClasses = async () => {
        if (!session || status !== 'authenticated') {
            return;
        }

        try {
            const authToken = localStorage.getItem('authToken');
            const userId = session.user.id;
            const data = await fetchDataWhereAttrIs(
                'classes_users',
                { 'classes_users.user_id': userId },
                authToken
            );
            setClassesUserJoined(data.map(item => item.class_id));
        } catch (error) {
            console.error('Error checking joined classes:', error);
        }
    };

    // Check which classes the user has pending approval (for students and admins)
    const checkUserPendingClasses = async () => {
        if (!session || status !== 'authenticated') {
            return;
        }

        try {
            const authToken = localStorage.getItem('authToken');
            const userId = session.user.id;

            // Use the new view to fetch pending classes
            const pendingData = await fetchViewData('pending_classes_view');
            const userPendingClasses = pendingData.filter(item => item.user_id === userId);

            setClassesPendingApproval(userPendingClasses.map(item => item.class_id));
        } catch (error) {
            console.error('Error checking pending classes:', error);
        }
    };

    // Check which classes the teacher owns (for teachers and admins)
    const checkTeacherOwnedClasses = async () => {
        if (!session || status !== 'authenticated') {
            return;
        }

        try {
            const authToken = localStorage.getItem('authToken');
            const userId = session.user.id;
            const data = await fetchDataWhereAttrIs(
                'classes',
                { 'classes.teacher_id': userId },
                authToken
            );
            setTeacherOwnedClasses(data.map(item => item.class_id));
        } catch (error) {
            console.error('Error checking owned classes:', error);
        }
    };

    const handlePaymentFlow = () => {
        // Only open the payer if cart has items
        if (cart.length > 0) {
            setShowPayer(true);
        }
    };

    // Handle batch joining classes
    const joinClassesBatch = async () => {
        setIsJoining(true);

        if (!session) {
            console.error('User not authenticated');
            setIsJoining(false);
            return;
        }

        try {
            // Process each class in the cart
            const authToken = localStorage.getItem('authToken');
            const userId = session.user.id;
            // Add the class IDs to the pending table
            // This is just a placeholder for your actual API call
            const pendingAdditions = cart.map(classId => ({
                user_id: userId,
                class_id: classId
                // Other fields like screenshot_path would be added in the actual implementation
            }));

            // Here you'd make the API call to add these pending requests
            console.log('Adding pending classes:', pendingAdditions);

            // After successful submission, update the pending classes list
            setClassesPendingApproval([...classesPendingApproval, ...cart]);

            // Clear the cart
            setCart([]);

        } catch (error) {
            console.error('Error joining classes:', error);
        } finally {
            setIsJoining(false);
        }
    };

    // Open the full-screen classroom overlay
    const openClassroomOverlay = (course) => {
        setSelectedCourse(course);
        setShowClassroomOverlay(true);
    };

    // Close the full-screen classroom overlay
    const closeClassroomOverlay = () => {
        setShowClassroomOverlay(false);
        setSelectedCourse(null);
    };

    // Add a class to the cart (only for students)
    const addToCart = (classId) => {
        const userLevel = getUserLevel();

        // Only students can add to cart
        if (userLevel !== 0) {
            return;
        }

        if (status !== 'authenticated') {
            router.push('/registration/login');
            return;
        }

        if (classesUserJoined.includes(classId) || classesPendingApproval.includes(classId)) {
            return; // Already joined or pending, don't add to cart
        }

        if (!cart.includes(classId)) {
            setCart([...cart, classId]);
        }
    };

    // Remove a class from the cart
    const removeFromCart = (classId) => {
        setCart(cart.filter(id => id !== classId));
    };

    // Check class status: joined, pending, owned, or available
    const getClassStatus = (classId) => {
        const userLevel = getUserLevel();

        // For teachers and admins, check if they own the class
        if ((userLevel === 1 || userLevel === 2) && teacherOwnedClasses.includes(classId)) {
            return 'owned';
        }

        // For students and admins, check joined/pending status
        if ((userLevel === 0 || userLevel === 2) && classesUserJoined.includes(classId)) {
            return 'joined';
        }

        if ((userLevel === 0 || userLevel === 2) && classesPendingApproval.includes(classId)) {
            return 'pending';
        }

        return 'available';
    };

    // Render different buttons based on user level and class status
    const renderClassActionButton = (classItem) => {
        const userLevel = getUserLevel();
        const classStatus = getClassStatus(classItem.class_id);
        const inCart = cart.includes(classItem.class_id);

        if (status !== 'authenticated') {
            return (
                <button
                    className={styles.cartButton}
                    onClick={() => router.push('/registration/login')}
                >
                    Login to Join
                </button>
            );
        }

        switch (classStatus) {
            case 'owned':
                return (
                    <span className={`${styles.joinStatus} ${styles.owned}`}>
                        You Own This Class
                    </span>
                );
            case 'joined':
                return (
                    <span className={`${styles.joinStatus} ${styles.joined}`}>
                        Joined
                    </span>
                );
            case 'pending':
                return (
                    <span className={`${styles.joinStatus} ${styles.pending}`}>
                        Pending Approval
                    </span>
                );
            default:
                // Only students can add to cart
                if (userLevel === 0) {
                    return inCart ? (
                        <button
                            className={`${styles.cartButton} ${styles.removeCart}`}
                            onClick={() => removeFromCart(classItem.class_id)}
                        >
                            Remove from Cart
                        </button>
                    ) : (
                        <button
                            className={styles.cartButton}
                            onClick={() => addToCart(classItem.class_id)}
                        >
                            Add to Cart
                        </button>
                    );
                } else {
                    // Teachers and admins just view the class
                    return (
                        <span className={styles.availableClass}>
                            Available Class
                        </span>
                    );
                }
        }
    };

    // Show loading while checking authentication status
    if (status === 'loading') {
        return <Loading />;
    }

    // Main render - now shows for all authentication states
    return (
        <div className={styles.container}>
            <SEO pageKey={"classes"} />
            {/* Side Panel with Grade Selection */}
            <div className={styles.sidePanel}>
                <h1 className={styles.header}>
                    {status === 'authenticated'
                        ? `Select Classes ${getUserLevel() === 0 ? '(Student)' : getUserLevel() === 1 ? '(Teacher)' : '(Admin)'}`
                        : 'Select Classes'
                    }
                </h1>
                <div className={`${styles.gradeCards} scrollable`}>
                    {gradesData.length > 0 ? (
                        gradesData.map(grade => (
                            <div
                                key={grade.grade_id}
                                className={`${styles.gradeCard} ${activeGradeId === grade.grade_id ? styles.activegrade : ''} fade-in`}
                                onClick={() => setActiveGradeId(grade.grade_id)}
                            >
                                <h2>{grade.grade_name[0].toUpperCase() + grade.grade_name.slice(1)}</h2>
                            </div>
                        ))
                    ) : (
                        <Loading />
                    )}
                </div>
            </div>

            {/* Main Section with Classes */}
            <main className={`${styles.mainSection} scrollable`}>
                {groupedClassesData ? (
                    groupedClassesData.length > 0 ? (
                        groupedClassesData.map(course => (
                            <div className={`${styles.classCards} fade-in`} key={course.course_id}>
                                <h3>{course.course_name}</h3>
                                <span>{course.course_description}</span>
                                <button onClick={() => openClassroomOverlay(course)}>View Classrooms</button>
                            </div>
                        ))
                    ) : (
                        <div>
                            <p>No classes available for this grade. Please select another grade.</p>
                        </div>
                    )
                ) : (
                    <Loading />
                )}
            </main>

            {/* Full-screen Classroom Overlay */}
            {showClassroomOverlay && selectedCourse && (
                <div className={styles.fullScreenOverlay}>
                    <div className={styles.overlayContent}>
                        <div className={styles.overlayHeader}>
                            <h2>{selectedCourse.course_name} Classrooms</h2>
                            <button className={styles.closeButton} onClick={closeClassroomOverlay}>×</button>
                        </div>
                        <div className={styles.overlayBody}>
                            <ul className={`${styles.classroomList} scrollable`}>
                                {selectedCourse.classes.map(classItem => {
                                    return (
                                        <li key={classItem.class_id} className={styles.classroomItem}>
                                            <div className={styles.classroomInfo}>
                                                <div className={styles.classroomDetails}>
                                                    <span className={styles.teacher}>
                                                        {getTeacher(classItem.teacher_id)?.user_name || 'Teacher'}
                                                        <button onClick={() => router.push(`/profile/${classItem.teacher_id}`)}>View Profile</button>
                                                    </span>
                                                    <span className={styles.time}>
                                                        <div>
                                                            <div>
                                                                <time>
                                                                    {getDate(classItem.start_time).yyyymmdd}
                                                                </time>
                                                                to
                                                                <time>
                                                                    {getDate(classItem.end_time).yyyymmdd}
                                                                </time>
                                                            </div>
                                                            <div>
                                                                <time>
                                                                    {getDate(classItem.start_time).hhmmss}
                                                                </time>
                                                                -
                                                                <time>
                                                                    {getDate(classItem.end_time).hhmmss}
                                                                </time>
                                                            </div>
                                                        </div>
                                                        <span>
                                                            every
                                                            <time>
                                                                {classItem.repeat_every_n_day}
                                                            </time>
                                                            days
                                                        </span>
                                                    </span>
                                                    <span className={styles.cost}>
                                                        {classItem.cost}
                                                    </span>
                                                </div>
                                                {renderClassActionButton(classItem)}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Checkout Overlay - Only for students */}
            {cart.length > 0 && getUserLevel() === 0 && (
                <div className={styles.cartFloatingButton} onClick={() => handlePaymentFlow()}>
                    <span>{cart.length}</span>
                    <span>{isJoining ? 'Processing...' : 'Checkout'}</span>
                </div>
            )}

            {/* Payment Component - Only for students */}
            {showPayer && getUserLevel() === 0 && (
                <Payer
                    cart={cart}
                    classesData={classItem}
                    teachersData={teachersData}
                    onClose={() => {
                        setShowPayer(false);
                    }}
                    onSuccess={() => {
                        joinClassesBatch();
                        // We don't set showPayer to false here since joinClassesBatch
                        // will handle the process and set isJoining accordingly
                    }}
                    isJoining={isJoining}
                />
            )}
        </div>
    );
}
