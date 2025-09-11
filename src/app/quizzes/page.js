import QuizzesClient from './QuizzesClient';
import '../global.css';
import styles from '../../styles/Quiz.module.css';
import { getMetadata } from '@/app/seoConfig';

export const metadata = getMetadata('quiz');

export default function QuizzesPage() {
    return (
        <div className={styles.container}>
            <QuizzesClient />
        </div>
    );
}
