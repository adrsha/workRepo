import '../../global.css';
import ProfileClient from './ProfileClient';

export const metadata = {
    title: 'User Profile',
    description: 'View user profile information, classes, and details'
};

export default function Profile({ params }) {
    return <ProfileClient params={params} />;
}
