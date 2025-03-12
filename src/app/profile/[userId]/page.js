'use client';
import { use, useState, useEffect } from 'react';
import { fetchDataWhereAttrIs, fetchViewData } from '../../lib/helpers.js';
import { useSession } from 'next-auth/react';
import styles from '../../../styles/Profile.module.css';
import '../../global.css';

export default function Profile({ params }) {
    const { data: session, status } = useSession();
    const [userData, setUserData] = useState(null);
    const [teacherData, setTeacherData] = useState(null);
    const [studentData, setStudentData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const userId = parseInt(use(params).userId);
    
    useEffect(() => {
        setIsLoading(true);
        fetchViewData('users_view')
            .then((data) => {
                // Find the user with matching ID
                const matchedUser = data.find(user => parseInt(user.user_id) === userId);
                
                if (matchedUser) {
                    setUserData(matchedUser);
                } else {
                    setError('User not found');
                }
            })
            .catch(err => {
                console.error('Error fetching user data:', err);
                setError('Failed to load user profile');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [userId]);

    useEffect(() => {
        if (userData) {
            if (userData.user_level === 1) {
                fetchViewData('teachers_view').then((data) => {
                    setTeacherData(data.find((teacher) => teacher.user_id === userData.user_id));
                });
            } else if (userData.user_level === 0) {
                fetchViewData('students_view').then((data) => {
                    setStudentData(data.find((student) => student.user_id === userData.user_id));
                });
            }
        }
    }, [userData]);
    
    // Map user levels to readable names
    const getUserLevelName = (level) => {
        const levels = {
            0: 'Student',
            1: 'Teacher',
            2: 'Admin',
        };
        return levels[level] || `Level ${level}`;
    };
    
    if (isLoading) {
        return (
            <div className={styles.profileLoading}>
                <div className={styles.loadingSpinner}>Loading profile...</div>
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
    
    return (
        <div className={styles.profileContainer}>
            <div className={styles.profileHeader}>
                <div className={styles.profileAvatar}>
                    {userData.user_name.charAt(0) || '?'}
                </div>
                <div className={styles.profileTitle}>
                    <h1 className={styles.profileName}>{userData.user_name || 'Unknown User'}</h1>
                    <span className={styles.profileBadge}>{getUserLevelName(userData.user_level)}</span>
                </div>
            </div>
            
            <div className={styles.profileContent}>
                <div className={styles.profileSection}>
                    <h2>Contact Information</h2>
                    <div className={styles.profileInfoItem}>
                        <span className={styles.infoLabel}>Email:</span>
                        <span className={styles.infoValue}>{userData.user_email || 'No email provided'}</span>
                    </div>
                    {userData.contact && (
                        <div className={styles.profileInfoItem}>
                            <span className={styles.infoLabel}>Phone:</span>
                            <span className={styles.infoValue}>{userData.contact}</span>
                        </div>
                    )}
                </div>
                
                {(userData.user_level === 1) && teacherData && (
                    <div className={styles.profileSection}>
                        <h2>Teacher Information</h2>
                        <div className={styles.profileInfoItem}>
                            <span className={styles.infoLabel}>Qualification:</span>
                            <span className={styles.infoValue}>{teacherData.qualification || 'Not specified'}</span>
                        </div>
                        <div className={styles.profileInfoItem}>
                            <span className={styles.infoLabel}>Experience:</span>
                            <span className={styles.infoValue}>{teacherData.experience || 'Not specified'}</span>
                        </div>
                    </div>
                )}
                
                {userData.user_level === 0 && studentData && (
                    <div className={styles.profileSection}>
                        {console.log(userData, studentData)}
                        <h2>Student Information</h2>
                        <div className={styles.profileInfoItem}>
                            <span className={styles.infoLabel}>{studentData.guardian_relation}:</span>
                            <span className={styles.infoValue}>{studentData.guardian_name || 'Not specified'}</span>
                        </div>
                        <div className={styles.profileInfoItem}>
                            <span className={styles.infoLabel}>Contact:</span>
                            <span className={styles.infoValue}>{studentData.guardian_contact || 'Not specified'}</span>
                        </div>
                        <div className={styles.profileInfoItem}>
                            <span className={styles.infoLabel}>School:</span>
                            <span className={styles.infoValue}>{studentData.school || 'Not specified'}</span>
                        </div>
                    </div>
                )}
                
                <div className={styles.profileSection}>
                    <h2>Account Information</h2>
                    <div className={styles.profileInfoItem}>
                        <span className={styles.infoLabel}>User ID:</span>
                        <span className={styles.infoValue}>{userData.user_id}</span>
                    </div>
                    <div className={styles.profileInfoItem}>
                        <span className={styles.infoLabel}>Joined:</span>
                        <span className={styles.infoValue}>
                            {userData.created_at 
                                ? new Date(userData.created_at).toLocaleDateString() 
                                : 'Unknown'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
