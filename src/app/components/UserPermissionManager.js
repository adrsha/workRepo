// UserPermissionManager.jsx
import { useState, useEffect } from 'react';
import styles from '@/styles/UserPermissionManager.module.css';

export const UserPermissionManager = ({ 
    contentId, 
    entityType = null,
    entityId = null,
    onSave, 
    onCancel 
}) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [currentPermissions, setCurrentPermissions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Fetch permissions data on mount
    useEffect(() => {
        const fetchPermissionsData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const params = new URLSearchParams({ contentId });
                if (entityType) params.append('entityType', entityType);
                if (entityId) params.append('entityId', entityId);

                const response = await fetch(`/api/contentPermissions?${params}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch permissions');
                }

                setCurrentPermissions(data.currentPermissions || []);
                setAvailableUsers(data.availableUsers || []);
                
                // Initialize selected users with current permissions
                const currentUserIds = data.currentPermissions?.map(p => p.user_id) || [];
                setSelectedUsers(currentUserIds);

            } catch (err) {
                console.error('Error fetching permissions:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (contentId) {
            fetchPermissionsData();
        }
    }, [contentId, entityType, entityId]);

    const filteredUsers = availableUsers.filter(user =>
        user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUserToggle = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        
        try {
            const response = await fetch('/api/contentPermissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contentId,
                    userIds: selectedUsers,
                    entityType,
                    entityId
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save permissions');
            }

            // Call the parent's onSave callback if provided
            if (onSave) {
                await onSave(selectedUsers, data);
            }

        } catch (err) {
            console.error('Error saving permissions:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedUsers.length === filteredUsers.length && filteredUsers.length > 0) {
            // Deselect all filtered users
            const filteredUserIds = filteredUsers.map(u => u.user_id);
            setSelectedUsers(prev => prev.filter(id => !filteredUserIds.includes(id)));
        } else {
            // Select all filtered users
            const filteredUserIds = filteredUsers.map(u => u.user_id);
            setSelectedUsers(prev => {
                const combined = [...prev, ...filteredUserIds];
                return [...new Set(combined)]; // Remove duplicates
            });
        }
    };

    const selectedCount = selectedUsers.length;
    const filteredSelectedCount = filteredUsers.filter(u => selectedUsers.includes(u.user_id)).length;
    const isAllFilteredSelected = filteredUsers.length > 0 && filteredSelectedCount === filteredUsers.length;

    if (loading) {
        return (
            <div className={styles.modal}>
                <div className={styles.modalContent}>
                    <div className={styles.loading}>Loading permissions...</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modal}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>Manage Content Permissions</h3>
                    <button onClick={onCancel} className={styles.closeButton}>×</button>
                </div>

                {error && (
                    <div className={styles.error}>
                        Error: {error}
                    </div>
                )}

                <div className={styles.searchSection}>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                    <div className={styles.selectionInfo}>
                        {selectedCount > 0 && (
                            <span className={styles.selectedCount}>
                                {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
                            </span>
                        )}
                        {filteredUsers.length > 1 && (
                            <button 
                                onClick={handleSelectAll}
                                className={styles.selectAllButton}
                                type="button"
                            >
                                {isAllFilteredSelected ? 'Deselect All' : 'Select All'} 
                                ({filteredUsers.length})
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.usersList}>
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => {
                            const hasCurrentPermission = currentPermissions.some(p => p.user_id === user.user_id);
                            return (
                                <div key={user.user_id} className={styles.userItem}>
                                    <label className={styles.userLabel}>
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.user_id)}
                                            onChange={() => handleUserToggle(user.user_id)}
                                            className={styles.userCheckbox}
                                        />
                                        <div className={styles.userInfo}>
                                            <div className={styles.userName}>
                                                {user.user_name}
                                                {hasCurrentPermission && (
                                                    <span className={styles.currentPermissionIndicator}>
                                                        (current)
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.userEmail}>{user.user_email}</div>
                                            {user.user_level !== null && (
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

                {selectedCount > 0 && (
                    <div className={styles.selectedUsersPreview}>
                        <h4>Selected Users ({selectedCount}):</h4>
                        <div className={styles.selectedUsersList}>
                            {availableUsers
                                .filter(user => selectedUsers.includes(user.user_id))
                                .map(user => (
                                    <span key={user.user_id} className={styles.selectedUserTag}>
                                        {user.user_name}
                                        <button 
                                            onClick={() => handleUserToggle(user.user_id)}
                                            className={styles.removeUserButton}
                                            type="button"
                                            aria-label={`Remove ${user.user_name}`}
                                        > × </button>
                                    </span>
                                ))
                            }
                        </div>
                    </div>
                )}

                <div className={styles.modalActions}>
                    <button onClick={onCancel} className={styles.cancelButton}>
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className={styles.saveButton}
                    >
                        {saving ? 'Saving...' : `Save Permissions${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};
