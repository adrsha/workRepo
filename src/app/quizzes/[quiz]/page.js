// /app/quizzes/[quiz]/page.js - Individual quiz page
import QuizDetailsClient from './QuizDetailsClient';
import { getMetadata } from '@/app/seoConfig';
import '../../global.css';
import styles from '../../../styles/Quiz.module.css';

export const metadata = getMetadata('quiz');

export default function QuizDetailsPage({ params }) {
    const quizId = params.quiz;

    return (
        <div className={styles.container}>
            <QuizDetailsClient quizId={quizId} />
        </div>
    );
}
