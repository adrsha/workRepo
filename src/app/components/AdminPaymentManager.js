import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from '@/styles/AdminPaymentManager.module.css';

export const AdminPaymentManager = () => {
    const { data: session } = useSession();
    const [payments,         setPayments]         = useState([]);
    const [loading,          setLoading]          = useState(false);
    const [filter,           setFilter]           = useState('pending');
    const [selectedPayment,  setSelectedPayment]  = useState(null);
    const [adminNotes,       setAdminNotes]       = useState('');
    const [processing,       setProcessing]       = useState(false);
    const [screenshotModal,  setScreenshotModal]  = useState(null);

    useEffect(() => {
        if (session?.user?.level >= 1) {
            fetchPayments();
        }
    }, [session, filter]);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/contentPayments?status=${filter}&limit=50`);
            if (response.ok) {
                const data = await response.json();
                setPayments(data);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const processPayment = async (paymentId, action) => {
        setProcessing(true);
        try {
            const response = await fetch('/api/admin/contentPayments/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId,
                    action,
                    adminNotes: adminNotes.trim()
                })
            });

            if (response.ok) {
                await fetchPayments();
                setSelectedPayment(null);
                setAdminNotes('');
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error || 'Failed to process payment'}`);
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Error processing payment. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatCurrency = (amount) => {
        return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending:  { className: styles.pendingBadge,  text: 'Pending' },
            approved: { className: styles.approvedBadge, text: 'Approved' },
            rejected: { className: styles.rejectedBadge, text: 'Rejected' }
        };
        const config = statusConfig[status] || statusConfig.pending;
        return <span className={config.className}>{config.text}</span>;
    };

    const getEntityTypeDisplay = (entityType) => {
        const typeMap = {
            quiz:   'Quiz',
            notice: 'Notice'
        };
        return typeMap[entityType] || entityType;
    };

    const getContentTypeIcon = (contentType) => {
        switch (contentType) {
            case 'file': return '📎';
            case 'text': return '📄';
            default:     return '📋';
        }
    };

    if (!session?.user || session.user.level < 1) {
        return <div className={styles.unauthorized}>Access denied</div>;
    }

    return (
        <div className={styles.paymentManager}>
            <div className={styles.header}>
                <h2>Content Payment Management</h2>
                <div className={styles.filterControls}>
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="">All</option>
                    </select>
                    <button 
                        onClick={fetchPayments} 
                        className={styles.refreshButton}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading payments...</div>
            ) : payments.length === 0 ? (
                <div className={styles.noPayments}>
                    No {filter || 'content'} payments found
                </div>
            ) : (
                <div className={styles.paymentsList}>
                    {payments.map(payment => (
                        <div key={payment.payment_id} className={styles.paymentCard}>
                            <div className={styles.paymentHeader}>
                                <div className={styles.paymentInfo}>
                                    <h3>{payment.user_name}</h3>
                                    <p>{payment.user_email}</p>
                                </div>
                                <div className={styles.paymentMeta}>
                                    {getStatusBadge(payment.status)}
                                    <span className={styles.amount}>
                                        {formatCurrency(payment.amount)}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.paymentDetails}>
                                <div className={styles.detailRow}>
                                    <strong>Entity:</strong> 
                                    {getEntityTypeDisplay(payment.entity_type)} - {payment.entity_title || `ID ${payment.entity_id}`}
                                </div>
                                <div className={styles.detailRow}>
                                    <strong>Content:</strong> 
                                    <span className={styles.contentType}>
                                        {getContentTypeIcon(payment.content_type)} {payment.content_type}
                                    </span>
                                </div>
                                <div className={styles.detailRow}>
                                    <strong>Submitted:</strong> {formatDate(payment.created_at)}
                                </div>
                                {payment.processed_at && (
                                    <div className={styles.detailRow}>
                                        <strong>Processed:</strong> {formatDate(payment.processed_at)}
                                        {payment.processed_by_name && ` by ${payment.processed_by_name}`}
                                    </div>
                                )}
                            </div>

                            {payment.screenshot_path && (
                                <div className={styles.screenshotSection}>
                                    <strong>Payment Screenshot:</strong>
                                    <button 
                                        onClick={() => setScreenshotModal(payment.screenshot_path)}
                                        className={styles.viewScreenshotButton}
                                    >
                                        View Screenshot
                                    </button>
                                </div>
                            )}

                            {payment.admin_notes && (
                                <div className={styles.adminNotesDisplay}>
                                    <strong>Admin Notes:</strong>
                                    <p>{payment.admin_notes}</p>
                                </div>
                            )}

                            {payment.status === 'pending' && (
                                <div className={styles.actionSection}>
                                    {selectedPayment === payment.payment_id ? (
                                        <div className={styles.processForm}>
                                            <textarea
                                                value={adminNotes}
                                                onChange={(e) => setAdminNotes(e.target.value)}
                                                placeholder="Optional admin notes..."
                                                className={styles.adminNotesInput}
                                                rows={3}
                                            />
                                            <div className={styles.processButtons}>
                                                <button 
                                                    onClick={() => processPayment(payment.payment_id, 'approve')}
                                                    disabled={processing}
                                                    className={styles.approveButton}
                                                >
                                                    {processing ? 'Processing...' : 'Approve Payment'}
                                                </button>
                                                <button 
                                                    onClick={() => processPayment(payment.payment_id, 'reject')}
                                                    disabled={processing}
                                                    className={styles.rejectButton}
                                                >
                                                    {processing ? 'Processing...' : 'Reject Payment'}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedPayment(null);
                                                        setAdminNotes('');
                                                    }}
                                                    className={styles.cancelButton}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.quickActions}>
                                            <button 
                                                onClick={() => processPayment(payment.payment_id, 'approve')}
                                                className={styles.quickApprove}
                                                disabled={processing}
                                            >
                                                Quick Approve
                                            </button>
                                            <button 
                                                onClick={() => setSelectedPayment(payment.payment_id)}
                                                className={styles.detailedProcess}
                                            >
                                                Process with Notes
                                            </button>
                                            <button 
                                                onClick={() => processPayment(payment.payment_id, 'reject')}
                                                className={styles.quickReject}
                                                disabled={processing}
                                            >
                                                Quick Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Screenshot Modal */}
            {screenshotModal && (
                <div className={styles.screenshotModal} onClick={() => setScreenshotModal(null)}>
                    <div className={styles.screenshotContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.screenshotHeader}>
                            <h3>Payment Screenshot</h3>
                            <button 
                                onClick={() => setScreenshotModal(null)}
                                className={styles.closeModal}
                            >
                                ×
                            </button>
                        </div>
                        <img 
                            src={screenshotModal} 
                            alt="Payment Screenshot" 
                            className={styles.screenshotImage}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
