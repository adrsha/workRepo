'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import '../global.css';
import styles from '../../styles/Grades.module.css';

import Loading from '../components/Loading';
import Payer from '../components/Payer';
import ClassroomOverlay from '../components/ChooseClassOverlay';

import { getDate } from '@/utils/dateTime';

import {
    fetchData,
    fetchViewData,
    getUserLevel,
    groupClassesByCourse,
    getClassStatus,
    addUniqueItems,
    fetchUserJoinedClasses,
    fetchUserPendingClasses,
    fetchTeacherOwnedClasses,
    fetchClassesForGrade,
    capitalizeFirst
} from '../lib/helpers';


/**
 * Check if user can add class to cart
 * @param {number} classId - Class ID
 * @param {number} userLevel - User access level
 * @param {Array} joinedClasses - User's joined classes
 * @param {Array} pendingClasses - User's pending classes
 * @param {Array} cart - Current cart contents
 * @returns {boolean} Whether class can be added to cart
 */
export const canAddToCart = (classId, userLevel, joinedClasses, pendingClasses, cart) => {
    // Only students can add to cart
    if (userLevel !== 0) return false;
    
    // Can't add if already joined or pending
    if (joinedClasses.includes(classId) || pendingClasses.includes(classId)) return false;
    
    // Can't add if already in cart
    if (cart.includes(classId)) return false;
    
    return true;
};

/**
 * Toggle cart details visibility
 * @param {string} cartDetailsSelector - CSS selector for cart details element
 * @param {string} collapsedClass - CSS class for collapsed state
 */
export const toggleCartDetails = (cartDetailsSelector, collapsedClass) => {
    const cartDetails = document.querySelector(cartDetailsSelector);
    if (cartDetails) {
        cartDetails.classList.toggle(collapsedClass);
    }
};

/**
 * Calculate total cost of items in cart
 * @param {Array} cart - Array of class IDs in cart
 * @param {Array} classesData - Array of class objects with cost information
 * @returns {number} Total cost rounded to 2 decimal places
 */
export const calculateCartTotal = (cart, classesData) => {
    return cart.reduce((total, classId) => {
        const classData = classesData.find(c => c.class_id === classId);
        return total + (parseFloat(classData?.cost || 0));
    }, 0);
};

/**
 * Find teacher by ID from teachers data array
 * @param {Array} teachersData - Array of teacher objects
 * @param {number} teacherId - Teacher ID to search for
 * @returns {Object|undefined} Teacher object or undefined if not found
 */
const findTeacherById = (teachersData, teacherId) => {
    return teachersData?.find(teacher => teacher.user_id === teacherId);
};


export default function GradesClient() {
    const router = useRouter();
    const { data: session, status, update } = useSession();

    const [gradesData, setGradesData] = useState([]);
    const [activeGradeId, setActiveGradeId] = useState(null);
    const [classesData, setClassesData] = useState(null);
    const [teachersData, setTeachersData] = useState([]);
    const [groupedClassesData, setGroupedClassesData] = useState(null);
    const [classesUserJoined, setClassesUserJoined] = useState([]);
    const [showPayer, setShowPayer] = useState(false);
    const [showClassroomOverlay, setShowClassroomOverlay] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [cart, setCart] = useState([]);
    const [isJoining, setIsJoining] = useState(false);
    const [classesPendingApproval, setClassesPendingApproval] = useState([]);
    const [teacherOwnedClasses, setTeacherOwnedClasses] = useState([]);
    const [classItem, setClassItem] = useState([]);

    const currentUserLevel = getUserLevel(session);

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
                    data = data.filter((item) => {
                        return item.grade_type == 'normal';
                    })
                    setGradesData(data)
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

        fetchClassesForGrade(activeGradeId, authToken, isAuthenticated)
            .then(data => {
                setClassesData(data);
                setClassItem(prev => addUniqueItems(prev, data, 'class_id'));
            })
            .catch(error => console.error('Error fetching classes:', error));

        if (isAuthenticated) {
            const userId = session?.user?.id;
            if (!userId) return;

            // For students (level 0), check joined and pending classes
            if (currentUserLevel === 0) {
                handleStudentClassData(userId, authToken);
            }

            // For teachers (level 1), check owned classes
            if (currentUserLevel === 1) {
                handleTeacherClassData(userId, authToken);
            }

            // For admins (level 2), check all data
            if (currentUserLevel === 2) {
                handleAdminClassData(userId, authToken);
            }
        }
    }, [activeGradeId, status, session, currentUserLevel]);

    // Group classes by course when classes data changes
    useEffect(() => {
        if (!classesData) return;

        const grouped = groupClassesByCourse(classesData);
        setGroupedClassesData(grouped);
    }, [classesData]);

    // Handle student-specific class data fetching
    const handleStudentClassData = async (userId, authToken) => {
        try {
            const [joinedClasses, pendingClasses] = await Promise.all([
                fetchUserJoinedClasses(userId, authToken),
                fetchUserPendingClasses(userId)
            ]);
            
            setClassesUserJoined(joinedClasses);
            setClassesPendingApproval(pendingClasses);
        } catch (error) {
            console.error('Error fetching student class data:', error);
        }
    };

    // Handle teacher-specific class data fetching
    const handleTeacherClassData = async (userId, authToken) => {
        try {
            const ownedClasses = await fetchTeacherOwnedClasses(userId, authToken);
            setTeacherOwnedClasses(ownedClasses);
        } catch (error) {
            console.error('Error fetching teacher class data:', error);
        }
    };

    // Handle admin-specific class data fetching (all data)
    const handleAdminClassData = async (userId, authToken) => {
        try {
            const [joinedClasses, pendingClasses, ownedClasses] = await Promise.all([
                fetchUserJoinedClasses(userId, authToken),
                fetchUserPendingClasses(userId),
                fetchTeacherOwnedClasses(userId, authToken)
            ]);
            
            setClassesUserJoined(joinedClasses);
            setClassesPendingApproval(pendingClasses);
            setTeacherOwnedClasses(ownedClasses);
        } catch (error) {
            console.error('Error fetching admin class data:', error);
        }
    };

    const handlePaymentFlow = () => {
        if (cart.length > 0) {
            setShowPayer(true);
        }
    };

    const joinClassesBatch = async () => {
        setIsJoining(true);

        if (!session) {
            console.error('User not authenticated');
            setIsJoining(false);
            return;
        }

        try {
            const authToken = localStorage.getItem('authToken');
            const userId = session.user.id;

            const pendingAdditions = cart.map(classId => ({
                user_id: userId,
                class_id: classId
            }));

            console.log('Adding pending classes:', pendingAdditions);
            setClassesPendingApproval([...classesPendingApproval, ...cart]);
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
        if (status !== 'authenticated') {
            router.push('/registration/login');
            return;
        }

        if (!canAddToCart(classId, currentUserLevel, classesUserJoined, classesPendingApproval, cart)) {
            return;
        }

        setCart([...cart, classId]);
    };

    // Remove a class from the cart
    const removeFromCart = (classId) => {
        setCart(cart.filter(id => id !== classId));
    };

    const renderClassActionButton = (classItem) => {
        const classStatus = getClassStatus(
            classItem.class_id, 
            currentUserLevel, 
            classesUserJoined, 
            classesPendingApproval, 
            teacherOwnedClasses
        );
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
                if (currentUserLevel === 0) {
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
                    return (
                        <span className={styles.availableClass}>
                            Available Class
                        </span>
                    );
                }
        }
    };

    const getUserRoleLabel = () => {
        switch (currentUserLevel) {
            case 0: return '(Student)';
            case 1: return '(Teacher)';
            case 2: return '(Admin)';
            default: return '';
        }
    };

    // Show loading while checking authentication status
    if (status === 'loading') {
        return <Loading />;
    }

    const cartTotal = calculateCartTotal(cart, classItem);

    return (
        <div className={styles.container}>
            {/* Side Panel with Grade Selection */}
            <div className={styles.sidePanel}>
                <h1 className={styles.header}>
                    {status === 'authenticated'
                        ? `Select Classes ${getUserRoleLabel()}`
                        : 'Select Classes'
                    }
                </h1>
                <div className={`${styles.gradeCards} scrollable`}>
                    {gradesData.length > 0 ? (
                        gradesData.map(grade => (
                            <div
                                key={grade.grade_id}
                                className={`${styles.gradeCard} ${activeGradeId === grade.grade_id ? styles.activeGrade : ''} fade-in`}
                                onClick={() => setActiveGradeId(grade.grade_id)}
                            >
                                <span>{capitalizeFirst(grade.grade_name)}</span>
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
                            <p>The new class for this group will start soon. Please check the website. Thank you.</p>
                            <p>यस समूहको लागि नयाँ कक्षा चाँडै सुरु हुनेछ। कृपया वेबसाइट हेर्नुहोस्। धन्यवाद।</p>
                        </div>
                    )
                ) : (
                    <Loading />
                )}
            </main>

            {/* Classroom Overlay Component */}
            {showClassroomOverlay && (
                <ClassroomOverlay
                    selectedCourse={selectedCourse}
                    onClose={closeClassroomOverlay}
                    getTeacher={(teacherId) => findTeacherById(teachersData, teacherId)}
                    renderClassActionButton={renderClassActionButton}
                />
            )}

            {/* Enhanced Cart Checkout Bar - Only for students */}
            {cart.length > 0 && currentUserLevel === 0 && (
                <div className={styles.checkoutBar}>
                    <div className={styles.checkoutContent}>
                        <div className={styles.cartSummary}>
                            <span className={styles.itemCount}>
                                {cart.length} {cart.length === 1 ? 'Class' : 'Classes'} Selected
                            </span>
                            <div className={styles.cartDetails}>
                                {cart.map(classId => {
                                    const classData = classItem.find(c => c.class_id === classId);
                                    if (!classData) return null;

                                    const teacher = findTeacherById(teachersData, classData.teacher_id);
                                    return (
                                        <div key={classId} className={styles.cartItem}>
                                            <div className={styles.classesHeader}>
                                                <span className={styles.courseName}>
                                                    {classData.course_name} - {classData?.grade_name || 'Grade'}
                                                </span>
                                            </div>
                                            <span className={styles.teacherName}>
                                                with {teacher?.user_name || 'Teacher'}
                                            </span>
                                            <span className={styles.classTime}>
                                                {getDate(classData.start_time).yyyymmdd} - {getDate(classData.end_time).yyyymmdd}
                                            </span>
                                            <span className={styles.classCost}>
                                                रू{classData.cost}
                                            </span>
                                            <button
                                                className={styles.removeItemBtn}
                                                onClick={() => removeFromCart(classId)}
                                                title="Remove from cart"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className={styles.totalSection}>
                            <div className={styles.totalAmount}>
                                Total: रू{cartTotal.toFixed(2)}
                            </div>
                            <div className={styles.checkoutActions}>
                                <button
                                    className={styles.clearCartBtn}
                                    onClick={() => setCart([])}
                                    disabled={isJoining}
                                >
                                    Clear Cart
                                </button>
                                <button
                                    className={styles.checkoutBtn}
                                    onClick={() => handlePaymentFlow()}
                                    disabled={isJoining}
                                >
                                    {isJoining ? (
                                        <span className={styles.loadingText}>
                                            <span className={styles.spinner}></span>
                                            Processing...
                                        </span>
                                    ) : (
                                        'Proceed to Payment'
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            className={styles.toggleCartBtn}
                            onClick={() => toggleCartDetails(`.${styles.cartDetails}`, styles.collapsed)}
                        >
                            <span className={styles.toggleIcon}>⌄</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Payment Component - Only for students */}
            {showPayer && currentUserLevel === 0 && (
                <Payer
                    cart={cart}
                    classesData={classItem}
                    teachersData={teachersData}
                    onClose={() => setShowPayer(false)}
                    onSuccess={() => joinClassesBatch()}
                    isJoining={isJoining}
                />
            )}
        </div>
    );
}
