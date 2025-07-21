'use client';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Input from '../components/Input';
import { updateTableData } from '../lib/helpers';
import styles from '../../styles/Settings.module.css';
import '../global.css';

const updateProfile = async (name, email, session) => {
    if (!session?.user?.id) return { success: false, error: 'No user session' };

    const updates = {};
    if (name && name !== session.user.name) updates.user_name = name;
    if (email && email !== session.user.email) updates.user_email = email;

    if (Object.keys(updates).length === 0) {
        return { success: true, message: 'No changes to update' };
    }

    try {
        await updateTableData('users', updates, { user_id: session.user.id });
        return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
        console.error('Failed to update profile:', error);
        return { success: false, error: error.message };
    }
};

const changePassword = async (email, oldPassword, newPassword) => {
    try {
        const res = await fetch('/api/changePass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, oldPassword, newPassword })
        });

        if (res.ok) {
            return { success: true, message: 'Password changed successfully' };
        }
        return { success: false, error: 'Password change failed' };
    } catch (error) {
        console.error('Password change error:', error);
        return { success: false, error: error.message };
    }
};

export function SettingsClient({ session: initialSession }) {
    const { data: session, status, update } = useSession();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (session) {
            setName(session.user.name || '');
            setEmail(session.user.email || '');
        }
    }, [session]);

    const handleProfileUpdate = async () => {
        setIsLoading(true);
        setMessage(null);

        const result = await updateProfile(name, email, session);

        if (result.success) {
            setMessage({ type: 'success', text: result.message });
            await update({ name, email }); // Update session
        } else {
            setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
        }

        setIsLoading(false);
    };

    const handlePasswordChange = async () => {
        setIsLoading(true);
        setMessage(null);

        const result = await changePassword(session?.user?.email, oldPassword, newPassword);

        if (result.success) {
            setMessage({ type: 'success', text: result.message });
            await signOut({ callbackUrl: '/registration/login' });
        } else {
            setMessage({ type: 'error', text: result.error || 'Failed to change password' });
        }

        setIsLoading(false);
    };

    return (
        <div className={styles.settingsWrapper}>
            <section className={styles.sidebar}>
                <h1>Settings</h1>
                <article>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={activeTab === 'profile' ? styles.activeTab : ''}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        className={activeTab === 'password' ? styles.activeTab : ''}
                    >
                        Password
                    </button>
                </article>
            </section>

            <div className={styles.mainContent}>
                <div className={styles.section}>
                    {message && (
                        <div className={`${styles.message} ${styles[message.type]}`}>
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <>
                            <h2 className={styles.sectionTitle}>Profile Information</h2>
                            <Input
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <Input
                                label="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <div className={styles.buttonGroup}>
                                <button
                                    onClick={handleProfileUpdate}
                                    className={styles.primaryButton}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Updating...' : 'Update Profile'}
                                </button>
                            </div>
                        </>
                    )}

                    {activeTab === 'password' && (
                        <>
                            <h2 className={styles.sectionTitle}>Change Password</h2>
                            <Input
                                label="Old Password"
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                            />
                            <Input
                                label="New Password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <div className={styles.buttonGroup}>
                                <button
                                    onClick={handlePasswordChange}
                                    className={styles.primaryButton}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Changing...' : 'Change Password'}
                                </button>
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={styles.cancelButton}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
