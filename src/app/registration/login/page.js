'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

// Project-specific imports
import Input from '../../components/Input.js';
import { SEO } from '../../seoConfig.js';
import styles from '../../../styles/Registration.module.css';
import '../../global.css';

export default function Login() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Async login handler with comprehensive error handling
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const payload = {
            contact: formData.get('contact'),
            password: formData.get('password'),
        };

        // Validate required fields
        const requiredFields = Array.from(e.currentTarget.querySelectorAll('[required]'));
        const emptyFields = requiredFields.filter((input) => !formData.get(input.name));

        if (emptyFields.length > 0) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

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
                contact: payload.contact,
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
            console.error(error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    // Render Login Form
    return (
        <div className={styles.registrationContainer}>
            <SEO pageKey="login" />
            {/* Login Process Guide */}
            <div className={styles.processGuide}>
                <div className={styles.processHeader}>
                    <h2>Welcome to</h2>
                    <h1>MeroTuition Login</h1>
                </div>
                
                <div className={styles.processSteps}>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>1</div>
                        <p>Enter your registered phone number and password to access your account.</p>
                    </div>
                    
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>2</div>
                        <p>After successful login, you will be directed to your personalized dashboard.</p>
                    </div>
                    
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>3</div>
                        <p>From your dashboard, you can access all courses, assignments, and learning materials.</p>
                    </div>
                </div>
                
                <div className={styles.processFooter}>
                    <p>Forgot your password? Contact support at info@merotuition.com</p>
                </div>
            </div>

            {/* Login Form */}
            <div className={styles.formContainer}>
                <h1 className={styles.formTitle}>Login</h1>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <Input 
                        label="Phone Number" 
                        type="tel" 
                        name="contact" 
                        id="contact" 
                        maxLength={10}
                        required
                    />
                    <Input 
                        label="Password" 
                        type="password" 
                        name="password" 
                        id="password" 
                        maxLength={60}
                        required
                    />
                    
                    {error && <p className={styles.errorDisplay}>{error}</p>}
                    
                    <button className={styles.submitButton} type="submit" disabled={loading}>
                        {loading ? 'Logging In...' : 'Login'}
                    </button>
                    
                    <div className={styles.authLink}>
                        Don't have an account? <a href="/registration/signup">Sign Up here!</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
