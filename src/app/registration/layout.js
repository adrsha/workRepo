'use client';
import { useSession } from 'next-auth/react';

export default function registrationLayout({ children }) {
    const { data: _, status, __ } = useSession();
    return status === 'authenticated' ? <> You are logged in. </> :
        <div>
            {children}
        </div>
        ;
}
