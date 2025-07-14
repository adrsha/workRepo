// components/Notices.js
'use client';
import { useSession } from 'next-auth/react';
import { useNoticesData } from '../../hooks/useNoticeData';
import { useNotifications } from '../../hooks/useNotifications';
import { useNoticeForm } from '../../hooks/useNoticeForm';
import { createNoticeHandlers } from '../../handlers/noticeHandlers';
import styles from '../../styles/Notices.module.css';
import { LoadingState, EmptyState } from './ui';
import { NoticeList } from './notice/NoticeList';
import { NoticeEditor } from './notice/NoticeEditor';
import { Toast } from './Toast';

const ToastContainer = ({ notifications }) => {
    return (
        <>
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

const AddNoticeSection = ({ isAdmin, formControls, noticeHandlers }) => {
    if (!isAdmin) return null;
    
    return (
        <div className={styles.addNoticeSection}>
            {formControls.isEditing ? (
                <NoticeEditor
                    noticeForm={formControls.noticeForm}
                    onUpdateForm={formControls.updateForm}
                    onSaveNotice={() => noticeHandlers.handleAddNotice(formControls.noticeForm)}
                    onCancel={formControls.resetForm}
                />
            ) : (
                <div className={styles.actionButtons}>
                    <button
                        className={styles.addButton}
                        onClick={() => formControls.setIsEditing(true)}
                    >
                        Add Notice
                    </button>
                </div>
            )}
        </div>
    );
};

const NoticesSection = ({ notices, isAdmin, noticeHandlers }) => {
    if (notices.length === 0) {
        return <EmptyState message="No notices available" />;
    }
    
    return (
        <NoticeList
            notices={notices || []}
            isAdmin={isAdmin}
            onDelete={noticeHandlers.handleDeleteNotice}
        />
    );
};

export default function Notices() {
    const { data: session } = useSession();
    const { notices, setNotices, loading, refetch } = useNoticesData(session);
    const notifications = useNotifications();
    const formControls = useNoticeForm();
    const isAdmin = session?.user?.level >= 1;
    
    const noticeHandlers = createNoticeHandlers(
        session,
        setNotices,
        notifications,
        formControls,
        refetch
    );

    if (loading) return <LoadingState />;

    return (
        <section className={styles.noticesSection}>
            <h2 className={styles.noticesTitle}>Notices</h2>
            
            <AddNoticeSection
                isAdmin={isAdmin}
                formControls={formControls}
                noticeHandlers={noticeHandlers}
            />
            
            <NoticesSection 
                notices={notices}
                isAdmin={isAdmin}
                noticeHandlers={noticeHandlers}
            />
            
            <ToastContainer notifications={notifications} />
        </section>
    );
}
