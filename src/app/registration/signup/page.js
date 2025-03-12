'use client';
import '../../global.css';
import Input from '../../components/Input.js';
import styles from '../../../styles/Registration.module.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_LENGTHS = {
    username: 50,
    email: 320,
    password: 60,
    contact: 10,
    guardianName: 50,
    guardianRelation: 30,
    guardianContact: 10,
    school: 100,
    class: 50,
    address: 100,
    dateOfBirth: 10, // YYYY-MM-DD
    experience: 255,
    qualification: 255,
};

export default function Signup() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [userLevel, setUserLevel] = useState('student');
    const router = useRouter();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        if (!formData.get('terms')) {
            setError('You must agree to the Terms and Conditions');
            setLoading(false);
            return;
        }

        const requiredFields = Array.from(e.currentTarget.querySelectorAll('[required]'));
        const emptyFields = requiredFields.filter((input) => !formData.get(input.name));

        if (emptyFields.length > 0) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        if (formData.get('password') !== formData.get('repeat-password')) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        // Base user data (common for all user types)
        let payload = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            contact: formData.get('contact'),
            userLevel,
            terms: formData.get('terms') === 'on',
            address: formData.get('address'),
        };

        // Add role-specific data
        if (userLevel === 'student') {
            payload = {
                ...payload,
                guardianName: formData.get('guardianName') || '',
                guardianRelation: formData.get('guardianRelation') || '',
                guardianContact: formData.get('guardianContact') || '',
                school: formData.get('school') || '',
                class: formData.get('class') || '',
                dateOfBirth: formData.get('dateOfBirth') || '',
            };
        } else if (userLevel === 'teacher') {
            payload = {
                ...payload,
                experience: formData.get('experience') || '',
                qualification: formData.get('qualification') || '',
            };
        }

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(response.message);
                throw new Error(data.error || 'Signup failed');
            }
            setError(response.message || "Signup successful");
            
        } catch (error) {
            console.error(error);
            setError(error.message);
        }

        setLoading(false);
    }

    return (
        <div>
            <h1 className="headers">Sign Up</h1>
            <form className={styles.signupForm} onSubmit={handleSubmit}>
                <span className={styles.flexyspan}>
                    <Input
                        label="Teacher"
                        type="radio"
                        name="user-level"
                        id="user-level-teacher"
                        checked={userLevel === 'teacher'}
                        onChange={() => setUserLevel('teacher')}
                    />
                    <Input
                        label="Student"
                        type="radio"
                        name="user-level"
                        id="user-level-student"
                        checked={userLevel === 'student'}
                        onChange={() => setUserLevel('student')}
                    />
                </span>

                <Input
                    label="Name"
                    type="text"
                    name="username"
                    id="username"
                    maxLength={MAX_LENGTHS.username}
                    required
                />
                <Input
                    label="Password"
                    type="password"
                    name="password"
                    id="password"
                    maxLength={MAX_LENGTHS.password}
                    required
                />
                <Input
                    label="Repeat Password"
                    type="password"
                    name="repeat-password"
                    id="repeat-password"
                    onChange={(e) => {
                        setError(e.target.value === e.target.form.password.value ? '' : 'Passwords do not match');
                    }}
                    required
                />
                <Input
                    label="Phone Number"
                    type="tel"
                    name="contact"
                    id="contact"
                    maxLength={MAX_LENGTHS.contact}
                    required
                />
                <Input
                    label="Address"
                    type="text"
                    name="address"
                    id="address"
                    maxLength={MAX_LENGTHS.address}
                    required
                />
                {userLevel === 'student' && (
                    <>
                        <Input label="Email" type="email" name="email" id="email" maxLength={MAX_LENGTHS.email}/>
                        <Input label="Guardian Name" type="text" name="guardianName" id="guardianName" required />
                        <span className={styles.flexyspan}>
                            <Input
                                label="Guardian Relation"
                                type="text"
                                name="guardianRelation"
                                id="guardianRelation"
                                maxLength={MAX_LENGTHS.guardianRelation}
                                required
                            />
                            <Input
                                label="Guardian Contact"
                                type="text"
                                name="guardianContact"
                                id="guardianName"
                                maxLength={MAX_LENGTHS.guardianContact}
                                required
                            />
                        </span>
                        <Input
                            label="School"
                            type="text"
                            name="school"
                            id="school"
                            maxLength={MAX_LENGTHS.school}
                            required
                        />
                        <Input
                            label="Class"
                            type="text"
                            name="class"
                            id="class"
                            maxLength={MAX_LENGTHS.class}
                            required
                        />
                        <Input label="Date Of Birth" type="date" name="dateOfBirth" id="dateOfBirth" required />
                    </>
                )}

                {userLevel === 'teacher' && (
                    <>
                        <Input label="Email" type="email" name="email" id="email" maxLength={MAX_LENGTHS.email} required/>
                        <Input
                            label="Brief Work Experience"
                            type="textarea"
                            name="experience"
                            id="experience"
                            maxLength={MAX_LENGTHS.experience}
                        />
                        <Input
                            label="Qualification"
                            type="text"
                            name="qualification"
                            id="qualification"
                            maxLength={MAX_LENGTHS.qualification}
                        />
                    </>
                )}

                <Input label="I agree to Terms and Conditions" type="checkbox" name="terms" id="terms" required />
                {error && <p className={styles.errorDisplay}>{error}</p>}

                <button className={styles.submitButton} type="submit" disabled={loading}>
                    {loading ? 'Signing Up...' : 'Sign Up'}
                </button>
            </form>
        </div>
    );
}
