'use client';
import { use, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from '../../../styles/Profile.module.css';
import '../../global.css';

import TeacherVideoUpload from "../../components/teacherUpload";
import { TeacherVideoPlayer } from '../../components/teacherFetch';
import { fetchDataWhereAttrIs, fetchJoinableData, getDate } from '../../lib/helpers';

import { SEO } from '../../seoConfig';

export default function Profile({ params }) {
    const { data: session, status } = useSession();
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [userEnrolledClasses, setUserEnrolledClasses] = useState([]);
    const userId = parseInt(use(params).userId);

    useEffect(() => {
        async function fetchProfile() {
            setIsLoading(true);

            try {
                // Fetch user profile data - API handles all permission checks
                const response = await fetch(`/api/users/${userId}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to load profile');
                }

                const profileData = await response.json();
                setUserData(profileData);
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError(err.message || 'An error occurred while loading the profile');
            } finally {
                setIsLoading(false);
            }
        }

        if (status !== 'loading') {
            fetchProfile();
        }
    }, [userId, status]);

    // Fetch current user's enrolled classes
    useEffect(() => {
        async function fetchUserEnrolledClasses() {
            if (!session?.user?.id) return;

            try {
                const authToken = localStorage.getItem('authToken');
                
                // Fetch classes the current user is enrolled in
                const enrolledClasses = await fetchDataWhereAttrIs(
                    'classes_users',
                    { user_id: session.user.id },
                    authToken
                );

                setUserEnrolledClasses(enrolledClasses?.map(enrollment => enrollment.class_id) || []);
            } catch (err) {
                console.error('Error fetching user enrolled classes:', err);
            }
        }

        if (session?.user?.id) {
            fetchUserEnrolledClasses();
        }
    }, [session?.user?.id]);

    // Fetch teacher's classes when userData is loaded and user is a teacher
    useEffect(() => {
        async function fetchTeacherClasses() {
            if (!userData || userData.user_level !== 1) return;

            setLoadingClasses(true);
            try {
                const authToken = localStorage.getItem('authToken');
                
                // Fetch classes with course and grade information
                const classesData = await fetchJoinableData(
                    ['classes', 'courses', 'grades'],
                    ['classes.course_id = courses.course_id', 'classes.grade_id = grades.grade_id'],
                    '*',
                    { 'classes.teacher_id': userId },
                    authToken
                );

                setTeacherClasses(classesData || []);
            } catch (err) {
                console.error('Error fetching teacher classes:', err);
            } finally {
                setLoadingClasses(false);
            }
        }

        fetchTeacherClasses();
    }, [userData, userId]);

    // Check if current user can view class details (enrolled or is the teacher)
    const canViewClassDetails = (classId) => {
        // If viewing own profile (teacher), can see all details
        if (session?.user?.id === userId) {
            return true;
        }
        
        // If enrolled in the class, can see details
        if (userEnrolledClasses.includes(classId)) {
            return true;
        }
        
        // Admin can see all details
        if (session?.user?.level === 2) {
            return true;
        }
        
        return false;
    };

    // Check if current user can see meeting URL
    const canViewMeetingUrl = (classId) => {
        // Only enrolled students, the teacher, or admins can see meeting URLs
        return canViewClassDetails(classId);
    };

    // Map user levels to readable names
    const getUserLevelName = (level) => {
        const levels = {
            0: 'Student',
            1: 'Teacher',
            2: 'Admin',
        };
        return levels[level] || `Level ${level}`;
    };

    // Helper to format field names for display
    const formatFieldName = (fieldName) => {
        // Remove common prefixes like user_, student_, etc.
        const withoutPrefix = fieldName.replace(/^(user_|teacher_|student_|guardian_)/, '');
        // Convert snake_case to Title Case
        return withoutPrefix
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Helper to format field values for display
    const formatFieldValue = (fieldName, value) => {
        if (value === null || value === undefined) return 'Not specified';

        // Format dates
        if (fieldName.includes('_at') || fieldName.includes('date')) {
            try {
                return new Date(value).toLocaleDateString();
            } catch (e) {
                return value;
            }
        }

        // Format boolean values
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }

        // Format level values
        if (fieldName === 'user_level') {
            return getUserLevelName(value);
        }

        return value;
    };

    // Determine which fields to exclude from display
    const excludedFields = [
        'password', 'user_password', 'hash', 'salt', 'token',
        'reset_token', 'updated_at', 'user_id', 'student_data', 'teacher_data'
    ];

    // Helper to check if field contains 'path' in its name
    const hasPathInName = (fieldName) => {
        return fieldName.toLowerCase().includes('path');
    };

    // Render a section with dynamic fields
    const renderDynamicSection = (title, data, excludeList = []) => {
        if (!data) return null;

        // Filter out sensitive fields, unwanted fields, and fields with 'path' in name
        const fields = Object.keys(data).filter(field =>
            !excludedFields.includes(field) &&
            !excludeList.includes(field) &&
            !hasPathInName(field) &&
            data[field] !== null
        );

        if (fields.length === 0) return null;

        return (
            <div className={styles.profileSection}>
                <h2>{title}</h2>
                {fields.map(field => (
                    <div key={field} className={styles.profileInfoItem}>
                        <span className={styles.infoLabel}>{formatFieldName(field)}:</span>
                        <span className={styles.infoValue}>{formatFieldValue(field, data[field])}</span>
                    </div>
                ))}
            </div>
        );
    };

    // Render teacher's classes section with access restrictions
    const renderTeacherClasses = () => {
        if (userData?.user_level !== 1) return null;

        return (
            <div className={styles.profileSection}>
                <h2>Classes Teaching</h2>
                {loadingClasses ? (
                    <div className={styles.loadingSpinner}>Loading classes...</div>
                ) : teacherClasses.length > 0 ? (
                    <div className={styles.teacherClassesList}>
                        {teacherClasses.map(classItem => {
                            const canViewDetails = canViewClassDetails(classItem.class_id);
                            const canViewMeeting = canViewMeetingUrl(classItem.class_id);
                            
                            return (
                                <div key={classItem.class_id} className={styles.classCard}>
                                    <div className={styles.classHeader}>
                                        <h3 className={styles.courseName}>{classItem.course_name}</h3>
                                        <span className={styles.gradeBadge}>{classItem.grade_name}</span>
                                    </div>
                                    
                                    {classItem.class_description && (
                                        <p className={styles.classDescription}>{classItem.class_description}</p>
                                    )}
                                    
                                    {canViewDetails ? (
                                        <div className={styles.classDetails}>
                                            <div className={styles.classTime}>
                                                <strong>Schedule:</strong>
                                                <div>
                                                    {getDate(classItem.start_time).yyyymmdd} to {getDate(classItem.end_time).yyyymmdd}
                                                </div>
                                                <div>
                                                    {getDate(classItem.start_time).hhmmss} - {getDate(classItem.end_time).hhmmss}
                                                </div>
                                                <div>
                                                    Repeats every {classItem.repeat_every_n_day} day{classItem.repeat_every_n_day !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                            
                                            <div className={styles.classCost}>
                                                <strong>Cost:</strong> ${classItem.cost}
                                            </div>
                                            
                                            {canViewMeeting && classItem.meeting_url && (
                                                <div className={styles.meetingUrl}>
                                                    <strong>Meeting:</strong>
                                                    <a 
                                                        href={classItem.meeting_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className={styles.meetingLink}
                                                    >
                                                        Join Class
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={styles.restrictedAccess}>
                                            <p className={styles.restrictedMessage}>
                                                <strong>Enrollment Required:</strong> Join this class to view schedule and meeting details.
                                            </p>
                                            <div className={styles.classCost}>
                                                <strong>Cost:</strong> ${classItem.cost}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className={styles.noClasses}>No classes found for this teacher.</p>
                )}
            </div>
        );
    };

    if (status === 'loading' || isLoading) {
        return (
            <div className={styles.profileLoading}>
                <div className={styles.loadingSpinner}>Loading profile...</div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div className={styles.profileError}>
                <h2>Authentication Required</h2>
                <p>You must be logged in to view profiles.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.profileError}>
                <h2>Error</h2>
                <p>{error}</p>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className={styles.profileError}>
                <h2>Profile Not Found</h2>
                <p>The requested profile could not be found or you don't have permission to view it.</p>
            </div>
        );
    }

    return (
        <div className={styles.profileContainer}>
            <SEO pageKey="profile" />
            <div className={styles.profileHeader}>
                <div className={styles.profileAvatar}>
                    {userData.user_name?.charAt(0) || '?'}
                </div>
                <div className={styles.profileTitle}>
                    <h1 className={styles.profileName}>{userData.user_name || 'Unknown User'}</h1>
                    <span className={styles.profileBadge}>{getUserLevelName(userData.user_level)}</span>
                </div>
            </div>

            <div className={styles.profileContent}>
                {/* Core user information */}
                {renderDynamicSection('Contact Information', userData, ['user_name', 'user_level'])}

                {/* Role-specific information */}
                {userData.user_level === 1 && userData.teacher_data &&
                    renderDynamicSection('Teacher Information', userData.teacher_data)}

                {userData.user_level === 0 && userData.student_data &&
                    renderDynamicSection('Student Information', userData.student_data)}

                {/* Teacher's classes section */}
                {renderTeacherClasses()}
            </div>

            {userData.user_level === 1 && userData.teacher_data && <TeacherVideoPlayer teacherId={userData.user_id} />}

            {
                session.user.level === 1 ?
                    <TeacherVideoUpload />
                    : null
            }
        </div>
    );
}
