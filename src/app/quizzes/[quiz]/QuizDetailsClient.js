// /app/quizzes/[quiz]/QuizDetailsClient.js
'use client';
import React from 'react';
import { useSession } from 'next-auth/react';
import { useNotifications } from '../../../hooks/useNotifications';
import { useContentForm } from '../../../hooks/useContentForm';
import { EntityDetailsClient } from '../../components/EntityDetailsClient';
import { Toast } from '../../components/Toast';

const QuizDetailsClient = ({ quizId }) => {
    const { data: session } = useSession();
    const notifications = useNotifications();
    const formControls = useContentForm();

    return (
        <>
            <EntityDetailsClient
                entityType="quizzes"
                entityId={quizId}
                session={session}
                notifications={notifications}
                formControls={formControls}
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
        </>
    );
};

export default QuizDetailsClient;
