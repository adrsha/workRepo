'use client';
import { useSession } from 'next-auth/react';
import styles from '../../styles/Registration.module.css';
export default function registrationLayout({ children }) {
    const { data: _, status, __ } = useSession();
    return  status === 'authenticated' ? <> You are logged in. </> :
        <div>
            <div className={styles.registrationContainer}>
                {children}
            </div>
        </div>
    ;
}
