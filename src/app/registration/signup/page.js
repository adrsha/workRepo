import SignupForm from './SignupForm';
import styles from '../../../styles/Registration.module.css';
import '../../global.css';

export default function Signup() {
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
                        <p>After submitting the form, if you are a teacher, you will receive your secret key confirmation message in your email. Once the admin contacts you, share this with them in order to get access as a teacher.</p>
                    </div>

                    <div className={styles.step}>
                        <div className={styles.stepNumber}>3</div>
                        <p>Once logged in, you can start your learning journey.</p>
                    </div>
                </div>

                <div className={styles.processFooter}>
                    <p>For any issues or queries, please contact us at info@merotuition.com</p>
                </div>
            </div>

            {/* Registration Form */}
            <SignupForm />
        </div>
    );
}
