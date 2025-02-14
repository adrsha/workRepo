'use client';
import '../../global.css';
import Input from '../../components/Input.js';
import styles from '../../../styles/Registration.module.css';
import { useState } from 'react';

export default function Signup() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        setError('');
        setLoading(true);
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const payload = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            terms: formData.get('terms') === 'on',
        };

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
                throw new Error(data.error || 'Signup failed');
            }

            console.log(data.message);
        } catch (error) {
            console.log(error);
            setError(error.message);
        }
        setLoading(false);
    }

    return (
        <div>
            <h1>Signing Up</h1>
            {error && <p className={styles.error}>{error}</p>}
            <form className={styles.signupForm} onSubmit={handleSubmit}>
                <span className={styles.flexyspan}>
                <Input
                    label="Teacher"
                    type="radio"
                    name="user-level"
                    id="user-level-teacher"
                />
                <Input
                    label="Student"
                    type="radio"
                    name="user-level"
                    id="user-level-student"
                />
                <Input
                    label="Admin"
                    type="radio"
                    name="user-level"
                    id="user-level-admin"
                />
                </span>
                <span className={styles.flexyspan}>
                <Input label="First Name" type="text" name="firstName" id="firstName" />
                <Input label="Last Name" type="text" name="lastName" id="lastName" />
                </span>
                <span className={styles.flexyspan}>
                <Input label="Guardian Name" type="text" name="guardianName" id="guardianName" />
                <Input label="Guardian Relation" type="text" name="guardianRelation" id="guardianRelation" />
                </span>
                <Input label="Email" type="email" name="email" id="email" />
                <Input label="Password" type="password" name="password" id="password" />
                <Input
                    label="Repeat Password"
                    type="password"
                    name="repeat-password"
                    id="repeat-password"
                    onChange={(e) => {
                        if (e.target.value === document.getElementById('password').value) {
                            setError('');
                        } else {
                            setError('Passwords do not match');
                        }
                    }}
                />
                <span className={styles.flexyspan}>
                <Input label="School" type="text" name="school" id="school" />
                <Input label="Class" type="text" name="class" id="class" />
                </span>
                <Input label="Contact" type="text" name="contact" id="contact" />
                <Input label="Address" type="text" name="address" id="address" />
                <Input label="Date Of Birth" type="date" name="dateOfBirth" id="dateOfBirthage" />
                <Input label="I agree to Terms and Conditions" type="checkbox" name="terms" id="terms" />
                <button className={styles.submitButton} type="submit">
                    {loading ? 'Signing Up...' : 'Sign Up'}
                </button>
            </form>
        </div>
    );
}
