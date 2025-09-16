// /app/games/GameList.js
'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useContentManager } from '../../hooks/useContentManager';
import { EntityList } from '../components/EntityList';
import { useNotifications } from '../../hooks/useNotifications';
import { Toast } from '../components/Toast';
import Loading from '../components/Loading';
import styles from '../../styles/Game.module.css';

const GameList = () => {
    const { data: session }    = useSession();
    const [viewedGames, setViewedGames] = useState(new Set());
    const notifications        = useNotifications();
    
    const {
        entities: games,
        loading,
        error,
        createEntity,
        deleteEntity,
        fetchEntities
    } = useContentManager('games', null, session);

    const isAdmin = session?.user && (session.user.level >= 1 || session.user.role === 'admin');

    // Cookie management for viewed games
    useEffect(() => {
        const loadViewedGames = () => {
            if (typeof document === 'undefined') return new Set();
            
            const cookieValue = document.cookie
                .split('; ')
                .find(row => row.startsWith('viewedGames='));
                
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

        setViewedGames(loadViewedGames());
        fetchEntities();
    }, [fetchEntities]);

    useEffect(() => {
        if (viewedGames.size > 0) {
            const serialized = JSON.stringify(Array.from(viewedGames));
            document.cookie = `viewedGames=${encodeURIComponent(serialized)};path=/;max-age=${30*24*60*60}`;
        }
    }, [viewedGames]);

    const handleGameClick = (gameId) => {
        setViewedGames(prev => new Set([...prev, gameId]));
    };

    const handleDeleteGame = async (gameId) => {
        if (!confirm('Are you sure you want to delete this game?')) return;
        
        try {
            await deleteEntity(gameId);
            notifications.setSuccess('Game deleted successfully');
        } catch (error) {
            notifications.setError(error.message);
        }
    };

    if (loading) return <Loading />;
    if (error) return <div className={styles.error}>Error: {error}</div>;

    return (
        <div className={styles.gameListPage}>
            <div className={styles.pageHeader}>
                <h1>Games</h1>
                {isAdmin && (
                    <CreateGameForm 
                        onCreateGame={createEntity}
                        notifications={notifications}
                    />
                )}
            </div>
            
            <EntityList
                entities={games}
                entityType="games"
                isAdmin={isAdmin}
                onDelete={handleDeleteGame}
                viewedEntities={viewedGames}
                onEntityClick={handleGameClick}
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

const CreateGameForm = ({ onCreateGame, notifications }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [showForm, setShowForm]     = useState(false);
    const [gameTitle, setGameTitle]   = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!gameTitle.trim()) {
            notifications.setError('Please enter a game title');
            return;
        }

        setIsCreating(true);
        try {
            await onCreateGame({
                game_title:     gameTitle,
                game_date_time: new Date().toISOString()
            });
            
            notifications.setSuccess('Game created successfully');
            setGameTitle('');
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
                Create New Game
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.createForm}>
            <input
                type="text"
                placeholder="Game title"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                disabled={isCreating}
                required
                className={styles.titleInput}
            />
            <div className={styles.formButtons}>
                <button 
                    type="submit" 
                    disabled={isCreating || !gameTitle.trim()}
                    className={styles.submitButton}
                >
                    {isCreating ? 'Creating...' : 'Create Game'}
                </button>
                <button 
                    type="button" 
                    onClick={() => {
                        setShowForm(false);
                        setGameTitle('');
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

export default GameList;
