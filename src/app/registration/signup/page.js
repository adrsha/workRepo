'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Project-specific imports
import Input from '../../components/Input.js';
import FileUpload from '../../components/FileUpload.js'; // Add this import
import styles from '../../../styles/Registration.module.css';
import '../../global.css';

const MAX_LENGTHS = {
    username: 50,
    email: 320,
    password: 60,
    contact: 10,
    guardianName: 50,
    guardianRelation: 30,
    guardianContact: 10,
    school: 100,
    address: 100,
    dateOfBirth: 10, // YYYY-MM-DD
    experience: 255,
    qualification: 255,
};

export default function Signup() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [userLevel, setUserLevel] = useState('student');
    const [certificateUploaded, setCertificateUploaded] = useState(false);
    const router = useRouter();

    const handleCertificateUpload = (fileData) => {
        setCertificateUploaded(true);
        setError(''); // Clear any previous errors
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        // Check terms agreement
        if (!formData.get('terms')) {
            setError('You must agree to the Terms and Conditions');
            setLoading(false);
            return;
        }

        // Check required fields
        const requiredFields = Array.from(e.currentTarget.querySelectorAll('[required]'));
        const emptyFields = requiredFields.filter((input) => !formData.get(input.name));

        if (emptyFields.length > 0) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        // Check certificate upload for teachers
        if (userLevel === 'teacher' && !formData.get('certificate_path')) {
            setError('Please upload your certificate');
            setLoading(false);
            return;
        }

        // Check password match
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
                certificatePath: formData.get('certificate_path') || '', // Add certificate path
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
                throw new Error(data.error || 'Signup failed');
            }
            
            // Successful signup: Navigate to login page
            router.push('/registration/login');
        } catch (error) {
            console.error(error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.registrationContainer}>
            {/* Registration Process Guide */}
            <div className={styles.processGuide}>
                <div className={styles.processHeader}>
                    <h2>Welcome to</h2>
                    <h1>MeroTuition Registration</h1>
                </div>
                
                <div className={styles.processSteps}>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>1</div>
                        <p>Complete the registration form with valid personal information as a student or teacher.</p>
                    </div>
                    
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>2</div>
                        <p>After submitting the form, if you are a teacher, you will receive your secret key confirmation message in your email. Once the admin contacts you, share this with them in order to get access as a teacher.
                        </p>
                    </div>
                    
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>3</div>
                        <p>Once logged in, you can start your learning journey.</p>
                    </div>
                </div>
                
                <div className={styles.processFooter}>
                    <p>For any issues or queries, please contact us at support@merotuition.com</p>
                </div>
            </div>

            {/* Registration Form */}
            <div className={styles.formContainer}>
                <h1 className={styles.formTitle}>Sign Up</h1>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.radioGroup}>
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
                    </div>

                    <Input
                        label="Name"
                        type="text"
                        name="username"
                        id="username"
                        maxLength={MAX_LENGTHS.username}
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
                            if (e.target.value !== e.target.form.password.value) {
                                setError('Passwords do not match');
                            } else {
                                setError('');
                            }
                        }}
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
                            <Input 
                                label="Email" 
                                type="email" 
                                name="email" 
                                id="email" 
                                maxLength={MAX_LENGTHS.email} 
                            />
                            <Input 
                                label="Guardian Name" 
                                type="text" 
                                name="guardianName" 
                                id="guardianName" 
                                maxLength={MAX_LENGTHS.guardianName}
                                required 
                            />
                            <div className={styles.formRow}>
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
                                    type="tel"
                                    name="guardianContact"
                                    id="guardianContact"
                                    maxLength={MAX_LENGTHS.guardianContact}
                                    required
                                />
                            </div>
                            <Input
                                label="Class"
                                type="text"
                                name="class"
                                id="class"
                                required
                            />
                            <Input
                                label="School"
                                type="text"
                                name="school"
                                id="school"
                                maxLength={MAX_LENGTHS.school}
                                required
                            />
                            <Input 
                                label="Date Of Birth" 
                                type="date" 
                                name="dateOfBirth" 
                                id="dateOfBirth" 
                                required 
                            />
                        </>
                    )}

                    {userLevel === 'teacher' && (
                        <>
                            <Input 
                                label="Email" 
                                type="email" 
                                name="email" 
                                id="email" 
                                maxLength={MAX_LENGTHS.email} 
                                required 
                            />
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
                            
                            {/* Certificate Upload Section */}
                            <div className={styles.formGroup}>
                                <label className={styles.inputLabel}>Certificate Upload *</label>
                                <FileUpload
                                    onFileUpload={handleCertificateUpload}
                                    classId="teacher-certificates" // You can use a generic classId for teacher certificates
                                    isSignUpForm={true}
                                    hiddenInputName="certificate_path"
                                />
                                <p className={styles.helpText}>
                                    Please upload your teaching certificate or relevant qualification document (PDF, JPG, PNG)
                                </p>
                            </div>
                        </>
                    )}

                    <Input 
                        label="I agree to Terms and Conditions" 
                        type="checkbox" 
                        name="terms" 
                        id="terms" 
                        required 
                    />
                    
                    {error && <p className={styles.errorDisplay}>{error}</p>}

                    <button className={styles.submitButton} type="submit" disabled={loading}>
                        {loading ? 'Signing Up...' : 'Sign Up'}
                    </button>
                    
                    <div className={styles.authLink}>
                        Already have an account? <a href="/registration/login">Login here</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
