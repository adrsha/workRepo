import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]/authOptions'; // Adjust path as needed
import { SettingsClient } from './SettingsClient';
import { redirect } from 'next/navigation';

export default async function Profile() {
    const session = await getServerSession(authOptions);
    
    if (!session) {
        redirect('/registration/login');
    }

    return <SettingsClient session={session} />;
}
