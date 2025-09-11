// components/QuizResults.js
import styles from '../../styles/Quiz.module.css';

export const QuizResults = ({ results, onViewAnswers, onBack }) => {
    const isDetailedView = results && results.attempts && results.questions;
    
    if (isDetailedView) {
        return (
            <div className={styles.quizResults}>
                <div className={styles.resultsHeader}>
                    <button className={styles.backButton} onClick={onBack}>
                        ← Back
                    </button>
                    <h2>Detailed Results: {results.quiz.quiz_title}</h2>
                </div>

                <div className={styles.quizStatistics}>
                    <h3>Quiz Statistics</h3>
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Total Questions:</span>
                            <span className={styles.statValue}>{results.statistics.total_questions}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Total Attempts:</span>
                            <span className={styles.statValue}>{results.statistics.total_attempts}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Average Score:</span>
                            <span className={styles.statValue}>
                                {(results.statistics.average_score)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.questionsAndAnswers}>
                    <h3>Questions & Answers</h3>
                    {results.questions.map((question, index) => (
                        <div key={question.question_id} className={styles.questionAnalysis}>
                            <div className={styles.questionHeader}>
                                <span className={styles.questionNum}>Q{index + 1}</span>
                                <span className={styles.questionText}>{question.question_text}</span>
                            </div>
                            <div className={styles.correctAnswer}>
                                <strong>Correct Answer:</strong> {question.correct_answer}
                            </div>
                            
                            <div className={styles.attemptAnswers}>
                                <h4>All Attempts:</h4>
                                {results.attempts.map((attempt) => (
                                    <div key={attempt.attempt_id} className={styles.attemptItem}>
                                        <div className={styles.attemptHeader}>
                                            <span>Attempt #{attempt.attempt_id}</span>
                                            <span>Score: {attempt.score}/{results.statistics.total_questions}</span>
                                            <span>{new Date(attempt.submitted_at).toLocaleString()}</span>
                                        </div>
                                        <div className={styles.userAnswer}>
                                            <strong>Answer:</strong> {attempt.answers[question.question_id] || 'No answer'}
                                            <span className={
                                                attempt.answers[question.question_id].toLowerCase() === question.correct_answer.toLowerCase()
                                                    ? styles.correct 
                                                    : styles.incorrect
                                            }>
                                                {attempt.answers[question.question_id].toLowerCase() === question.correct_answer.toLowerCase() ? '✓' : '✗'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Original simple view for single attempt results
    return (
        <div className={styles.quizResults}>
            <div className={styles.resultsHeader}>
                <button className={styles.backButton} onClick={onBack}>
                    ← Back
                </button>
                <h2>Quiz Results</h2>
            </div>
            {results && (
                <div className={styles.attemptSummary}>
                    <div className={styles.scoreDisplay}>
                        <h3>Your Score: {results.score}</h3>
                        <div className={styles.scorePercentage}>
                            ({results.percentage}%)
                        </div>
                    </div>
                    
                    {onViewAnswers && (
                        <button 
                            className={styles.viewAnswersButton}
                            onClick={onViewAnswers}
                        >
                            View Detailed Answers
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
