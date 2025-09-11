// components/QuizAttemptStatus.js
import styles from '../../styles/Quiz.module.css';

export const QuizAttemptStatus = ({ attemptStatus, onViewDetails, onBack, onTakeQuiz }) => {
    const { quiz, user_attempt } = attemptStatus;
    const hasAttempt = user_attempt && user_attempt.score !== undefined;
    return (
        <div className={styles.attemptStatus}>
            <div className={styles.attemptStatusHeader}>
                <button className={styles.backButton} onClick={onBack}>
                    ← Back
                </button>
                <div className={styles.detailsHeader}>
                    <h2>{quiz.quiz_title}</h2>
                </div>
            </div>

            {hasAttempt ? (
                <div className={styles.userScore}>
                    <h3>Your Latest Result</h3>
                    <div className={styles.scoreDisplay}>
                        <span className={styles.scoreNumber}>{user_attempt.score}</span>
                        <span className={styles.scoreDivider}>/</span>
                        <span className={styles.totalNumber}>{quiz.total_questions}</span>
                    </div>
                    <div className={styles.scorePercentage}>
                        {Math.round((user_attempt.score / quiz.total_questions) * 100)}%
                    </div>
                    <div className={styles.attemptInfo}>
                        <p>Completed on: {new Date(user_attempt.submitted_at).toLocaleDateString()}</p>
                    </div>
                </div>
            ) : (
                <div className={styles.userScore}>
                    <h3>Not Attempted Yet</h3>
                    <p>You haven't taken this quiz yet.</p>
                </div>
            )}

            <div className={styles.attemptActions}>
                {hasAttempt && (
                    <button
                        className={styles.viewDetailsButton}
                        onClick={onViewDetails}
                    >
                        View Detailed Results
                    </button>
                )}
                <button
                    className={styles.retakeButton}
                    onClick={onTakeQuiz}
                >
                    {hasAttempt ? 'Retake Quiz' : 'Take Quiz'}
                </button>
            </div>
        </div>
    );
};
