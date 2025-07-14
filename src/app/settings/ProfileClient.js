'use client';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import styles from '../../styles/Profile.module.css';

import Input from '../components/Input.js';
import { updateTableData } from '../lib/helpers.js';

import { useSession } from 'next-auth/react';
import '../global.css';

const updateProfile = async (name, email, session) => {
    if (!session?.user?.id) return;

    const updates = {};
    if (name && name !== session.user.name) updates.user_name = name;
    if (email && email !== session.user.email) updates.user_email = email;

    // Only make the API call if there are actual updates
    if (Object.keys(updates).length > 0) {
        try {
            await updateTableData('users', updates, { user_id: session.user.id });
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    }
};

export default function ProfileClient({ session: initialSession }) {
    const { data: session, status, update } = useSession();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showEditProfileMenu, setShowEditProfileMenu] = useState(false);
    const [showEditPasswordMenu, setShowEditPasswordMenu] = useState(false);
    const [name, setName] = useState(null);
    const [email, setEmail] = useState(null);

    async function passwordChange(oldPassword, newPassword) {
        try {
            const payload = {
                email: session.user.email,
                oldPassword: oldPassword,
                newPassword: newPassword,
            };

            const response = await fetch('/api/changePass', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                console.log(data);
            } else {
                console.error('Password change error:', response);
            }
        } catch (error) {
            console.error('Password change error:', error);
        }
    }

    useEffect(() => {
        if (session) {
            setName(session.user.name);
            setEmail(session.user.email);
        }
    }, [session]);

    useEffect(() => {
        updateProfile(name, email, session);
    }, [name, email]);

    return (
        <div className={styles.container}>
            <div className={styles.profile}>
                {!showEditProfileMenu ? (
                    <>
                        <h1>{name}</h1>
                        <p>{email}</p>
                        <button style={{ cursor: 'pointer' }} onClick={() => setShowEditProfileMenu((prev) => !prev)}>
                            Edit Profile
                        </button>
                    </>
                ) : (
                    <>
                        <h1
                            suppressContentEditableWarning
                            contentEditable="true"
                            onBlur={(e) => setName(e.target.innerText)}>
                            {name}
                        </h1>
                        <p
                            suppressContentEditableWarning
                            contentEditable="true"
                            onBlur={(e) => setEmail(e.target.innerText)}>
                            {email}
                        </p>
                        <button
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                setShowEditProfileMenu((prev) => !prev);
                                update();
                            }}>
                            Save Edit
                        </button>
                    </>
                )}

                <h1>Password Change</h1>
                {showEditPasswordMenu ? (
                    <div className={styles.editProfileMenu}>
                        <Input
                            label="Old Password"
                            onChange={(e) => setOldPassword(e.target.value)}
                            type="password"
                            name="oldPassword"
                            id="oldPassword"
                        />
                        <Input
                            label="New Password"
                            onChange={(e) => setNewPassword(e.target.value)}
                            type="password"
                            name="newPassword"
                            id="newPassword"
                        />
                        <button
                            onClick={() => {
                                passwordChange(oldPassword, newPassword);
                                setShowEditPasswordMenu((prev) => !prev);
                                signOut({ callbackUrl: '/registration/login' });
                            }}>
                            Change Password
                        </button>
                        <button
                            className={styles.cancelButton}
                            onClick={() => {
                                setShowEditPasswordMenu((prev) => !prev);
                            }}>
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            setShowEditPasswordMenu((prev) => !prev);
                        }}>
                        Change Password
                    </button>
                )}
            </div>
        </div>
    );
}
