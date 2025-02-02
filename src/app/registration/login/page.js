import "../../global.css";
import Input from "../../components/Input.js";
import styles from "../../../styles/Registration.module.css";
export default function Login() {
    return (
        <div>
            <h1>Login</h1>
            <form className={styles.loginForm}>
                <Input label="Username" type="text" name="username" id="username" />
                <Input label="Password" type="password" name="password" id="password" />
            </form>
                
        </div>
    );
}
