import '../global.css';
import { getMetadata } from '../seoConfig';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/authOptions';
import AboutUsClient from './AboutUsClient';

export const metadata = getMetadata('aboutus');

export default async function AboutUs() {
    const session = await getServerSession(authOptions);
    
    return (
        <AboutUsClient session={session} />
    );
}
