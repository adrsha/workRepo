// /app/quizzes/page.js - Quiz list page
import QuizList from './QuizList';
import { getMetadata } from '@/app/seoConfig';
import '../global.css';
import styles from '../../styles/Quiz.module.css';

export const metadata = getMetadata('quizzes');

export default function QuizzesPage() {
    return (
        <div className={styles.container}>
            <QuizList />
        </div>
    );
}
