import LoginForm from './LoginForm';
import styles from '../../../styles/Registration.module.css';
import '../../global.css';
import { getMetadata } from '../../seoConfig';

export const metadata = getMetadata('login');

export default function Login() {
    return (
        <div className={styles.registrationContainer}>
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

            <LoginForm />
        </div>
    );
}
