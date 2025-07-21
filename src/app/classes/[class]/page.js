import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/authOptions';
import ClassDetailsClient from './ClassDetailsClient';
import styles from '../../../styles/Profile.module.css';

export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function ClassDetailsPage({ params }) {
    const session = await getServerSession(authOptions);
    const classId = params.class;

    if (!session) return (
            <div className={styles.profileError}>
                <h2>Authentication Required</h2>
                <p>You must be logged in to view classes.</p>
            </div>
    )

    return (
        <ClassDetailsClient
            classId={classId}
            session={session}
        />
    );
}
