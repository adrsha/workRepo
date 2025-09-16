// /app/quizzes/QuizList.js
'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useContentManager } from '../../hooks/useContentManager';
import { EntityList } from '../components/EntityList';
import { useNotifications } from '../../hooks/useNotifications';
import { Toast } from '../components/Toast';
import Loading from '../components/Loading';
import styles from '../../styles/Quiz.module.css';

const QuizList = () => {
    const { data: session } = useSession();
    const [viewedQuizzes, setViewedQuizzes] = useState(new Set());
    const notifications = useNotifications();
    
    const {
        entities: quizzes,
        loading,
        error,
        createEntity,
        deleteEntity,
        fetchEntities
    } = useContentManager('quizzes', null, session);

    const isAdmin = session?.user && (session.user.level >= 1 || session.user.role === 'admin');

    // Cookie management for viewed quizzes
    useEffect(() => {
        const loadViewedQuizzes = () => {
            if (typeof document === 'undefined') return new Set();
            
            const cookieValue = document.cookie
                .split('; ')
                .find(row => row.startsWith('viewedQuizzes='));
                
            if (cookieValue) {
                try {
                    const parsed = JSON.parse(decodeURIComponent(cookieValue.split('=')[1]));
                    return new Set(parsed);
                } catch (e) {
                    return new Set();
                }
            }
            return new Set();
        };

        setViewedQuizzes(loadViewedQuizzes());
        fetchEntities();
    }, [fetchEntities]);

    useEffect(() => {
        if (viewedQuizzes.size > 0) {
            const serialized = JSON.stringify(Array.from(viewedQuizzes));
            document.cookie = `viewedQuizzes=${encodeURIComponent(serialized)};path=/;max-age=${30*24*60*60}`;
        }
    }, [viewedQuizzes]);

    const handleQuizClick = (quizId) => {
        setViewedQuizzes(prev => new Set([...prev, quizId]));
    };

    const handleDeleteQuiz = async (quizId) => {
        if (!confirm('Are you sure you want to delete this quiz?')) return;
        
        try {
            await deleteEntity(quizId);
            notifications.setSuccess('Quiz deleted successfully');
        } catch (error) {
            notifications.setError(error.message);
        }
    };

    if (loading) return <Loading />;
    if (error) return <div className={styles.error}>Error: {error}</div>;

    return (
        <div className={styles.quizListPage}>
            <div className={styles.pageHeader}>
                <h1>Quizzes</h1>
                {isAdmin && (
                    <CreateQuizForm 
                        onCreateQuiz={createEntity}
                        notifications={notifications}
                    />
                )}
            </div>
            
            <EntityList
                entities={quizzes}
                entityType="quizzes"
                isAdmin={isAdmin}
                onDelete={handleDeleteQuiz}
                viewedEntities={viewedQuizzes}
                onEntityClick={handleQuizClick}
            />
            
            {notifications.error && (
                <Toast
                    message={notifications.error}
                    type="error"
                    onClose={() => notifications.setError(null)}
                />
            )}
            {notifications.success && (
                <Toast
                    message={notifications.success}
                    type="success"
                    onClose={() => notifications.setSuccess(null)}
                />
            )}
        </div>
    );
};

const CreateQuizForm = ({ onCreateQuiz, notifications }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [quizTitle, setQuizTitle] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quizTitle.trim()) {
            notifications.setError('Please enter a quiz title');
            return;
        }

        setIsCreating(true);
        try {
            await onCreateQuiz({
                quiz_title: quizTitle,
                quiz_date_time: new Date().toISOString()
            });
            
            notifications.setSuccess('Quiz created successfully');
            setQuizTitle('');
            setShowForm(false);
        } catch (error) {
            notifications.setError(error.message);
        } finally {
            setIsCreating(false);
        }
    };

    if (!showForm) {
        return (
            <button 
                className={styles.createButton}
                onClick={() => setShowForm(true)}
            >
                Create New Quiz
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.createForm}>
            <input
                type="text"
                placeholder="Quiz title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                disabled={isCreating}
                required
                className={styles.titleInput}
            />
            <div className={styles.formButtons}>
                <button 
                    type="submit" 
                    disabled={isCreating || !quizTitle.trim()}
                    className={styles.submitButton}
                >
                    {isCreating ? 'Creating...' : 'Create Quiz'}
                </button>
                <button 
                    type="button" 
                    onClick={() => {
                        setShowForm(false);
                        setQuizTitle('');
                    }}
                    disabled={isCreating}
                    className={styles.cancelButton}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default QuizList;
