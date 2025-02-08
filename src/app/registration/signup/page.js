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
                <Input label="Username" type="text" name="username" id="username" />
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
                <Input label="I agree to Terms and Conditions" type="checkbox" name="terms" id="terms" />
                <button className={styles.submitButton} type="submit">
                    {loading ? 'Signing Up...' : 'Sign Up'}
                </button>
            </form>
        </div>
    );
}
