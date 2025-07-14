import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]/authOptions'; // Adjust path as needed
import ProfileClient from './ProfileClient';
import { redirect } from 'next/navigation';

export default async function Profile() {
    const session = await getServerSession(authOptions);
    
    if (!session) {
        redirect('/registration/login');
    }

    return <ProfileClient session={session} />;
}
