import '../../global.css';
import Input from '../../components/Input.js';
import styles from '../../../styles/Registration.module.css';
export default function Signup() {
    return (
        <div>
            <h1>Signup</h1>
            <form className={styles.signupForm}>
                <Input label="Username" type="text" name="username" id="username" />
                <Input label="Email" type="email" name="email" id="email" />
                <Input label="Password" type="password" name="password" id="password" />
                <Input label="I agree to Terms and Conditions" type="checkbox" name="terms" id="terms" />
                <button className={styles.submitButton} type="submit">Signup</button>
            </form>
        </div>
    );
}
