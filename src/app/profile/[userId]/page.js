'use client';
import { use, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from '../../../styles/Profile.module.css';
import '../../global.css';

export default function Profile({ params }) {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Render a section with dynamic fields
  const renderDynamicSection = (title, data, excludeList = []) => {
    if (!data) return null;

    // Filter out sensitive and unwanted fields
    const fields = Object.keys(data).filter(field =>
      !excludedFields.includes(field) &&
      !excludeList.includes(field) &&
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
      </div>
    </div>
  );
}
