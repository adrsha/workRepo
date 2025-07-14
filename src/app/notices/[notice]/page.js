import { use } from 'react';
import NoticeDetailsClient from './NoticeDetailsClient';
import '../../global.css';
import styles from '../../../styles/Notices.module.css';
import { getMetadata } from '@/app/seoConfig';

export const metadata = getMetadata('notice');


// Server component that can fetch data and handle SEO
export default function NoticeDetailsPage({ params }) {
    const noticeId = use(params)?.notice;
    
    return (
        <div className={styles.container}>
            <NoticeDetailsClient noticeId={noticeId} />
        </div>
    );
}
