// UserSelector.jsx - Enhanced reusable user selector component
import { useState, useEffect } from 'react';
import styles from '@/styles/UserSelector.module.css';

export const UserSelector = ({ 
    contentId,
    selectedUsers = [], 
    onSelectionChange, 
    entityType, 
    entityId,
    showSelectedPreview = true,
    maxHeight = '300px',
    placeholder = 'Search users...',
    className = ''
}) => {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    // Fetch users when dropdown opens
    useEffect(() => {
        const fetchUsers = async () => {
            if (!isOpen) return;

            setLoading(true);
            setError(null);
            
            try {
                const params = new URLSearchParams();
                if (contentId) params.append('contentId', contentId);
                if (entityType) params.append('entityType', entityType);
                if (entityId) params.append('entityId', entityId);

                const response = await fetch(`/api/contentPermissions?${params}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `Failed to fetch users: ${response.statusText}`);
                }

                // API gives { availableUsers, currentPermissions }
                setAvailableUsers(data.availableUsers || []);

            } catch (err) {
                console.error('Failed to fetch users:', err);
                setError(err.message);
                setAvailableUsers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [isOpen, contentId, entityType, entityId]);

    // Filter users based on search term
    const filteredUsers = availableUsers.filter(user =>
        user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle user selection toggle
    const handleUserToggle = (user) => {
        const isSelected = selectedUsers.some(u => u.user_id === user.user_id);
        const newSelection = isSelected
            ? selectedUsers.filter(u => u.user_id !== user.user_id)
            : [...selectedUsers, user];
            
        onSelectionChange(newSelection);
    };

    // Handle removing user from selection
    const handleRemoveUser = (userId) => {
        const newSelection = selectedUsers.filter(u => u.user_id !== userId);
        onSelectionChange(newSelection);
    };

    // Handle select/deselect all filtered users
    const handleSelectAll = () => {
        const filteredSelectedCount = filteredUsers.filter(u => 
            selectedUsers.some(selected => selected.user_id === u.user_id)
        ).length;
        
        const isAllFilteredSelected = filteredUsers.length > 0 && 
                                     filteredSelectedCount === filteredUsers.length;

        if (isAllFilteredSelected) {
            // Remove all filtered users from selection
            const filteredUserIds = filteredUsers.map(u => u.user_id);
            const newSelection = selectedUsers.filter(u => !filteredUserIds.includes(u.user_id));
            onSelectionChange(newSelection);
        } else {
            // Add all filtered users to selection
            const existingIds = selectedUsers.map(u => u.user_id);
            const usersToAdd = filteredUsers.filter(u => !existingIds.includes(u.user_id));
            const newSelection = [...selectedUsers, ...usersToAdd];
            onSelectionChange(newSelection);
        }
    };

    // Calculate selection stats
    const selectedCount = selectedUsers.length;
    const filteredSelectedCount = filteredUsers.filter(u => 
        selectedUsers.some(selected => selected.user_id === u.user_id)
    ).length;
    const isAllFilteredSelected = filteredUsers.length > 0 && 
                                 filteredSelectedCount === filteredUsers.length;

    return (
        <div className={`${styles.userSelector} ${className}`}>
            {/* Selected Users Preview */}
            {showSelectedPreview && selectedUsers.length > 0 && (
                <div className={styles.selectedUsersPreview}>
                    <div className={styles.previewHeader}>
                        <span className={styles.selectedCount}>
                            {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
                        </span>
                    </div>
                    <div className={styles.selectedUsersList}>
                        {selectedUsers.map(user => (
                            <div key={user.user_id} className={styles.selectedUserTag}>
                                <span className={styles.selectedUserName}>
                                    {user.user_name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveUser(user.user_id)}
                                    className={styles.removeUserButton}
                                    aria-label={`Remove ${user.user_name}`}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Dropdown Toggle */}
            <div className={styles.dropdownContainer}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`${styles.dropdownToggle} ${isOpen ? styles.open : ''}`}
                    aria-expanded={isOpen}
                >
                    <span>
                        {isOpen ? 'Close User Selection' : 'Select Users'}
                        {selectedCount > 0 && !isOpen && ` (${selectedCount})`}
                    </span>
                    <span className={`${styles.dropdownArrow} ${isOpen ? styles.open : ''}`}>
                        ▼
                    </span>
                </button>
                
                {/* Dropdown Content */}
                {isOpen && (
                    <div className={styles.dropdownContent} style={{ maxHeight }}>
                        {/* Search and Controls */}
                        <div className={styles.searchSection}>
                            <input
                                type="text"
                                placeholder={placeholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                            
                            {/* Selection Controls */}
                            <div className={styles.selectionControls}>
                                {selectedCount > 0 && (
                                    <span className={styles.selectionInfo}>
                                        {selectedCount} selected
                                    </span>
                                )}
                                {filteredUsers.length > 1 && (
                                    <button 
                                        onClick={handleSelectAll}
                                        className={styles.selectAllButton}
                                        type="button"
                                    >
                                        {isAllFilteredSelected ? 'Deselect All' : 'Select All'}
                                        {searchTerm && ` (${filteredUsers.length})`}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className={styles.errorMessage}>
                                Error: {error}
                            </div>
                        )}

                        {/* Loading State */}
                        {loading ? (
                            <div className={styles.loadingMessage}>
                                Loading users...
                            </div>
                        ) : (
                            /* Users List */
                            <div className={styles.usersList}>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => {
                                        const isSelected = selectedUsers.some(u => u.user_id === user.user_id);
                                        const userEmail = user.user_email || user.email;
                                        
                                        return (
                                            <div key={user.user_id} className={styles.userItem}>
                                                <label className={styles.userLabel}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleUserToggle(user)}
                                                        className={styles.userCheckbox}
                                                    />
                                                    <div className={styles.userInfo}>
                                                        <div className={styles.userName}>
                                                            {user.user_name}
                                                        </div>
                                                        {userEmail && (
                                                            <div className={styles.userEmail}>
                                                                {userEmail}
                                                            </div>
                                                        )}
                                                        {user.user_level !== null && user.user_level !== undefined && (
                                                            <div className={styles.userLevel}>
                                                                Level: {user.user_level}
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className={styles.noUsers}>
                                        {searchTerm ? 'No users match your search' : 'No users available'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
