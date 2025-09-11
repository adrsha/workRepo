'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import styles from '../../styles/Quiz.module.css';
import Loading from '../components/Loading';
import { Toast } from '../components/Toast';
import { useQuizzesData, useQuizData } from '../../hooks/useQuizData';
import { useQuizForm } from '../../hooks/useQuizForm';
import { useNotifications } from '../../hooks/useNotifications';
import { createQuizHandlers } from '@/handlers/quizHandlers';
import { useQuizAttemptStatus } from '../../hooks/useQuizAttemptStatus';
import { QuizAttemptStatus } from '../components/QuizAttemptStatus';
import { QuizResults } from '../components/QuizResults';

const QuizCard = ({ quiz, onSelect, onDelete, canDelete }) => (
    <div className={styles.quizCard}>
        <div className={styles.quizHeader}>
            <h3 className={styles.quizTitle}>{quiz.quiz_title}</h3>
            {canDelete && (
                <button
                    className={styles.deleteButton}
                    onClick={() => onDelete(quiz.quiz_id)}
                    aria-label="Delete quiz"
                >
                    ×
                </button>
            )}
        </div>
        <div className={styles.quizMeta}>
            <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
            <span>{quiz.question_count || 0} questions</span>
        </div>
        <button
            className={styles.selectButton}
            onClick={() => onSelect(quiz.quiz_id)}
        >
            Open Quiz
        </button>
    </div>
);

const QuizList = ({ quizzes, onSelectQuiz, onDeleteQuiz, canDelete }) => {
    if (!quizzes?.length) {
        return (
            <div className={styles.emptyState}>
                <p>No quizzes available</p>
            </div>
        );
    }

    return (
        <div className={styles.quizGrid}>
            {quizzes.map(quiz => (
                <QuizCard
                    key={quiz.quiz_id}
                    quiz={quiz}
                    onSelect={onSelectQuiz}
                    onDelete={onDeleteQuiz}
                    canDelete={canDelete}
                />
            ))}
        </div>
    );
};

const CreateQuizForm = ({ onCreateQuiz, onCancel }) => {
    const { quizForm, updateForm, resetForm } = useQuizForm();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        const trimmedTitle = quizForm.quiz_title?.trim();
        if (!trimmedTitle) return;

        setIsSubmitting(true);
        try {
            await onCreateQuiz(trimmedTitle);
            resetForm();
        } finally {
            setIsSubmitting(false);
        }
    }, [quizForm.quiz_title, onCreateQuiz, resetForm]);

    return (
        <form onSubmit={handleSubmit} className={styles.createForm}>
            <div className={styles.formHeader}>
                <h3>Create New Quiz</h3>
                <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>
            <div className={styles.inputGroup}>
                <input
                    type="text"
                    value={quizForm.quiz_title || ''}
                    onChange={(e) => updateForm('quiz_title', e.target.value)}
                    placeholder="Quiz title"
                    className={styles.titleInput}
                    required
                />
            </div>
            <button
                type="submit"
                className={styles.createButton}
                disabled={!quizForm.quiz_title?.trim() || isSubmitting}
            >
                {isSubmitting ? 'Creating...' : 'Create Quiz'}
            </button>
        </form>
    );
};

const QuestionForm = ({ onAddQuestion, quizId }) => {
    const { quizForm, updateForm, resetForm } = useQuizForm();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        const trimmedQuestion = quizForm.question_text?.trim();
        const trimmedAnswer = quizForm.correct_answer?.trim();

        if (!trimmedQuestion || !trimmedAnswer) return;

        setIsSubmitting(true);
        try {
            await onAddQuestion(quizId, trimmedQuestion, trimmedAnswer);
            resetForm();
        } finally {
            setIsSubmitting(false);
        }
    }, [quizForm.question_text, quizForm.correct_answer, onAddQuestion, quizId, resetForm]);

    return (
        <form onSubmit={handleSubmit} className={styles.questionForm}>
            <h4>Add Question</h4>
            <div className={styles.inputGroup}>
                <textarea
                    value={quizForm.question_text || ''}
                    onChange={(e) => updateForm('question_text', e.target.value)}
                    placeholder="Question text"
                    className={styles.questionInput}
                    rows={3}
                    required
                />
            </div>
            <div className={styles.inputGroup}>
                <input
                    type="text"
                    value={quizForm.correct_answer || ''}
                    onChange={(e) => updateForm('correct_answer', e.target.value)}
                    placeholder="Correct answer"
                    className={styles.answerInput}
                    required
                />
            </div>
            <button
                type="submit"
                className={styles.addButton}
                disabled={!quizForm.question_text?.trim() || !quizForm.correct_answer?.trim() || isSubmitting}
            >
                {isSubmitting ? 'Adding...' : 'Add Question'}
            </button>
        </form>
    );
};

const QuestionsList = ({ quizId, questions, onDeleteQuestion, canEdit }) => {
    if (!questions?.length) {
        return (
            <div className={styles.emptyQuestions}>
                <p>No questions added yet</p>
            </div>
        );
    }

    return (
        <div className={styles.questionsList}>
            <h4>Questions ({questions.length})</h4>
            {questions.map((question, index) => (
                <div key={question.question_id || index} className={styles.questionItem}>
                    <div className={styles.questionNumber}>{index + 1}</div>
                    <div className={styles.questionContent}>
                        <p className={styles.questionText}>{question?.question_text}</p>
                        {question?.correct_answer && (
                            <p className={styles.correctAnswer}>
                                <strong>Answer:</strong> {question.correct_answer}
                            </p>
                        )}
                    </div>
                    {canEdit && question?.question_id && (
                        <button
                            className={styles.deleteQuestionButton}
                            onClick={() => onDeleteQuestion(quizId, question.question_id)}
                            aria-label="Delete question"
                        >
                            ×
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

const QuizTaker = ({ quiz, questions, onSubmitQuiz, onCancel }) => {
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAnswerChange = useCallback((questionId, answer) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmitQuiz(quiz.quiz_id, answers);
        } finally {
            setIsSubmitting(false);
        }
    }, [quiz.quiz_id, answers, onSubmitQuiz]);

    const canSubmit = useMemo(() => {
        return questions?.length > 0 && Object.keys(answers).length === questions.length;
    }, [answers, questions]);

    return (
        <div className={styles.quizTaker}>
            <div className={styles.quizTakerHeader}>
                <h2>Taking: {quiz.quiz_title}</h2>
                <button
                    className={styles.cancelTakeButton}
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.quizTakeForm}>
                {questions?.map((question, index) => (
                    <div key={question.question_id} className={styles.takeQuestionItem}>
                        <div className={styles.takeQuestionNumber}>{index + 1}</div>
                        <div className={styles.takeQuestionContent}>
                            <p className={styles.takeQuestionText}>{question.question_text}</p>
                            <input
                                type="text"
                                className={styles.takeAnswerInput}
                                value={answers[question.question_id] || ''}
                                onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
                                placeholder="Your answer..."
                                required
                            />
                        </div>
                    </div>
                ))}

                <button
                    type="submit"
                    className={styles.submitQuizButton}
                    disabled={isSubmitting || !canSubmit}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
            </form>
        </div>
    );
};

const QuizDetails = ({ quizData, onAddQuestion, onDeleteQuestion, onBack, onTakeQuiz, canEdit }) => {
    const { quiz, questions } = quizData || {};

    if (!quiz) {
        return (
            <div className={styles.error}>
                <p>Quiz data not available</p>
                <button className={styles.backButton} onClick={onBack}>
                    Back
                </button>
            </div>
        );
    }

    return (
        <div className={styles.quizDetails}>
            <div className={styles.quizInfo}>
                <div className={styles.quizInfoItem}>
                    <span className={styles.infoLabel}>Created:</span>
                    <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                </div>
                <div className={styles.quizInfoItem}>
                    <span className={styles.infoLabel}>Questions:</span>
                    <span>{questions?.length || 0}</span>
                </div>
                <div className={styles.quizInfoItem}>
                    <span className={styles.infoLabel}>Status:</span>
                    <span className={quiz.is_active ? styles.statusActive : styles.statusInactive}>
                        {quiz.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            {canEdit && (
                <QuestionForm
                    onAddQuestion={onAddQuestion}
                    quizId={quiz.quiz_id}
                />
            )}

            <QuestionsList
                quizId={quiz.quiz_id}
                questions={questions}
                onDeleteQuestion={onDeleteQuestion}
                canEdit={canEdit}
            />
        </div>
    );
};

const QuizzesHeader = ({ onToggleCreate, isCreating, canCreate }) => (
    <div className={styles.header}>
        <h1>Quiz Dashboard</h1>
        {canCreate && (
            <button
                className={styles.createToggle}
                onClick={onToggleCreate}
            >
                {isCreating ? 'Cancel' : '+ Create Quiz'}
            </button>
        )}
    </div>
);

export default function QuizzesPage() {
    const { data: session, status } = useSession();
    const [selectedQuizId, setSelectedQuizId] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [takingQuiz, setTakingQuiz] = useState(false);
    const [quizResults, setQuizResults] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [showAttemptStatus, setShowAttemptStatus] = useState(false);

    const { attemptStatus, loading: attemptLoading, refetch: refetchAttemptStatus } = useQuizAttemptStatus(
        selectedQuizId,
        session
    );
    // Memoize user permissions to prevent re-renders
    const userPermissions = useMemo(() => {
        if (!session?.user?.level) return { isTeacher: false, canCreate: false, canEdit: false };

        const isTeacher = session.user.level >= 1;
        return {
            isTeacher,
            canCreate: isTeacher,
            canEdit: isTeacher
        };
    }, [session?.user?.level]);

    const { quizzes, setQuizzes, loading, error } = useQuizzesData(session);
    const {
        quizDetails,
        loading: quizLoading,
        error: quizError,
        refetch
    } = useQuizData(selectedQuizId);

    const notifications = useNotifications();

    // Memoize handlers to prevent re-creation on every render
    const handlers = useMemo(() => {
        if (!session) return null;
        return createQuizHandlers(
            session,
            setQuizzes,
            notifications,
            refetch
        );
    }, [session, setQuizzes, notifications, refetch]);

    // Memoized callbacks for state updates
    const handleSelectQuiz = useCallback(async (quizId) => {
        notifications.clearNotifications();
        setSelectedQuizId(quizId);
        setShowCreateForm(false);
        setTakingQuiz(false);
        setShowResults(false);
        setShowAttemptStatus(true);
    }, [notifications]);

    const handleBackToList = useCallback(() => {
        notifications.clearNotifications();
        setSelectedQuizId(null);
        setTakingQuiz(false);
        setShowResults(false);
        setQuizResults(null);
    }, [notifications]);

    const toggleCreateForm = useCallback(() => {
        notifications.clearNotifications();
        setShowCreateForm(prev => !prev);
        setSelectedQuizId(null);
        setTakingQuiz(false);
        setShowResults(false);
    }, [notifications]);

    const handleCreateQuiz = useCallback(async (title) => {
        if (!handlers) return;
        try {
            await handlers.handleCreateQuiz(title);
            setShowCreateForm(false);
        } catch (err) {
            // Error handled in handlers
        }
    }, [handlers]);

    const handleTakeQuiz = useCallback(() => {
        setTakingQuiz(true);
        setShowResults(false);
    }, []);

    const handleCancelTaking = useCallback(() => {
        setTakingQuiz(false);
    }, []);

    const handleSubmitQuiz = useCallback(async (quizId, answers) => {
        if (!handlers) return;
        try {
            const result = await handlers.handleSubmitQuiz(quizId, answers);
            setQuizResults(result);
            setTakingQuiz(false);
            setShowResults(true);

            await refetchAttemptStatus();
        } catch (err) {
            throw new Error("Error while submitting quiz", err);
        }
    }, [handlers, refetchAttemptStatus]);

    const handleViewAnswers = useCallback(async () => {
        if (!handlers || !selectedQuizId) return;
        try {
            const detailedResults = await handlers.handleGetQuizAnswers(selectedQuizId);
            setQuizResults(prev => ({ ...prev, ...detailedResults }));
        } catch (err) {
            console.error("Handling view answers error:", err)
        }
    }, [handlers, selectedQuizId]);

    const handleViewAttemptDetails = useCallback(async () => {
        if (!handlers || !selectedQuizId) return;
        try {
            const detailedResults = await handlers.handleGetQuizAnswers(selectedQuizId);
            setQuizResults(detailedResults);
            setShowAttemptStatus(false);
            setShowResults(true);
        } catch (err) {
            console.err("Error while fetching attempt details:", err);
        }
    }, [handlers, selectedQuizId]);

    const handleTakeFromStatus = useCallback(() => {
        setShowAttemptStatus(false);
        setTakingQuiz(true);
    }, []);

    // Handle error notifications with useEffect to prevent infinite renders
    useEffect(() => {
        if (error) {
            notifications.showError(`Error loading quizzes: ${error}`);
        }
    }, [error, notifications]);

    // Handle notifications effect with proper cleanup
    useEffect(() => {
        if (notifications.error) {
            console.log('Error notification:', notifications.error);
        }
        if (notifications.success) {
            console.log('Success notification:', notifications.success);
        }
    }, [notifications.error, notifications.success]);

    // Loading state check
    if (status === 'loading' || loading) {
        return <Loading />;
    }

    return (
        <div className={styles.container}>
            {notifications.error && (
                <Toast
                    message={notifications.error}
                    type="error"
                    onClose={notifications.clearError}
                />
            )}
            {notifications.success && (
                <Toast
                    message={notifications.success}
                    type="success"
                    onClose={notifications.clearSuccess}
                />
            )}

            {selectedQuizId ? (
                <>
                    {attemptLoading ? <Loading />
                        : showAttemptStatus && attemptStatus ?
                            <QuizAttemptStatus
                                attemptStatus={attemptStatus}
                                onViewDetails={handleViewAttemptDetails}
                                onBack={handleBackToList}
                                onTakeQuiz={handleTakeFromStatus}
                            /> : null
                    }
                    {(quizLoading) || !quizDetails ? (
                        <Loading />
                    ) : quizError ? (
                        <div className={styles.error}>
                            <p>Error loading quiz: {quizError}</p>
                            <button onClick={handleBackToList}>Back to Quizzes</button>
                        </div>
                    ) : showResults && (quizResults || attemptStatus) ? (
                        <QuizResults
                            results={quizResults}
                            onViewAnswers={handleViewAnswers}
                            onBack={handleBackToList}
                        />
                    ) : takingQuiz ? (
                        <QuizTaker
                            quiz={quizDetails.quiz}
                            questions={quizDetails.questions}
                            onSubmitQuiz={handleSubmitQuiz}
                            onCancel={handleCancelTaking}
                        />
                    ) : (
                        <QuizDetails
                            quizData={quizDetails}
                            onAddQuestion={handlers?.handleAddQuestion}
                            onDeleteQuestion={handlers?.handleDeleteQuestion}
                            onBack={handleBackToList}
                            onTakeQuiz={handleTakeQuiz}
                            canEdit={userPermissions.canEdit}
                        />
                    )}
                </>
            ) : (
                <>
                    <QuizzesHeader
                        onToggleCreate={toggleCreateForm}
                        isCreating={showCreateForm}
                        canCreate={userPermissions.canCreate}
                    />

                    {showCreateForm && (
                        <CreateQuizForm
                            onCreateQuiz={handleCreateQuiz}
                            onCancel={toggleCreateForm}
                        />
                    )}

                    <QuizList
                        quizzes={quizzes}
                        onSelectQuiz={handleSelectQuiz}
                        onDeleteQuiz={handlers?.handleDeleteQuiz}
                        canDelete={userPermissions.canCreate}
                    />
                </>
            )}
        </div>
    );
}
