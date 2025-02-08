'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

// Project-specific imports
import Input from '../../components/Input.js';
import styles from '../../../styles/Registration.module.css';
import '../../global.css';

export default function Login() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    // Async login handler with comprehensive error handling
    async function handleSubmit(e) {
        // Prevent default form submission
        e.preventDefault();

        // Reset previous states
        setError('');
        setLoading(true);

        // Extract form data
        const formData = new FormData(e.currentTarget);
        const payload = {
            email: formData.get('email'),
            password: formData.get('password'),
        };

        try {
            // Custom API validation step
            const apiResponse = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            // Parse API response
            const apiData = await apiResponse.json();

            // Throw error if API validation fails
            if (!apiResponse.ok) {
                throw new Error(apiData.error || 'Login failed');
            }

            // NextAuth authentication
            const signInResponse = await signIn('credentials', {
                // FIXED: Use payload keys instead of non-existent keys
                email: payload.email,
                password: payload.password,
                redirect: false,
            });

            // Throw error if NextAuth authentication fails
            if (signInResponse?.error) {
                throw new Error(signInResponse.error);
            }

            // Successful login: Navigate to home page
            router.push('/lmshome');
        } catch (error) {
            // Log and display error
            console.error(error);
            setError(error.message);
        } finally {
            // Ensure loading state is reset
            setLoading(false);
        }
    }

    // Render Login Form
    return (
        <div>
            <h1>Logging In</h1>
            {error && <p className={styles.error}>{error}</p>}

            <form className={styles.loginForm} onSubmit={handleSubmit}>
                <Input label="Email" type="text" name="email" id="email" />
                <Input label="Password" type="password" name="password" id="password" />
                <button className={styles.submitButton} type="submit">
                    {loading ? 'Logging In...' : 'Login'}
                </button>
            </form>
        </div>
    );
}
