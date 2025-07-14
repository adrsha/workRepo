import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/authOptions';
import ClassDetailsClient from './ClassDetailsClient';

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

    return (
        <ClassDetailsClient
            classId={classId}
            session={session}
        />
    );
}
