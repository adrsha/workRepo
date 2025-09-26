// PaymentRequestsTab.jsx - Admin payment management component
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import styles from '@/styles/PaymentRequestsTab.module.css';

export const PaymentRequestsTab = () => {
    const { data: session }        = useSession();
    const [payments,       setPayments]       = useState([]);
    const [loading,        setLoading]        = useState(false);
    const [filter,         setFilter]         = useState('pending');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [adminNotes,     setAdminNotes]     = useState('');
    const [processing,     setProcessing]     = useState(false);
    const [showScreenshot, setShowScreenshot] = useState(null);

    useEffect(() => {
        if (session?.user?.level >= 1) {
            fetchPayments();
        }
    }, [session, filter]);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/payments?status=${filter}&limit=100`);
            if (response.ok) {
                const data = await response.json();
                setPayments(data.payments || []);
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
            const response = await fetch('/api/admin/payments/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId,
                    action,
                    adminNotes
                })
            });

            if (response.ok) {
                await fetchPayments();
                setSelectedPayment(null);
                setAdminNotes('');
            } else {
                const errorData = await response.json();
                console.error('Error processing payment:', errorData.error);
                alert(`Error: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Network error occurred');
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatAmount = (amount) => {
        return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending:  { className: styles.pendingBadge,  text: 'Pending' },
            approved: { className: styles.approvedBadge, text: 'Approved' },
            rejected: { className: styles.rejectedBadge, text: 'Rejected' },
            failed:   { className: styles.failedBadge,   text: 'Failed' }
        };
        const config = statusConfig[status] || statusConfig.pending;
        return <span className={config.className}>{config.text}</span>;
    };

    const getEntityTypeDisplay = (entityType) => {
        const typeMap = {
            quiz:    'Quiz',
            notice:  'Notice',
            content: 'Content'
        };
        return typeMap[entityType] || entityType;
    };

    const getContentTitle = (payment) => {
        try {
            if (payment.content_data) {
                const data = JSON.parse(payment.content_data);
                return data.title || 'Untitled Content';
            }
            return `Content ID: ${payment.content_id}`;
        } catch {
            return `Content ID: ${payment.content_id}`;
        }
    };

    if (!session?.user || session.user.level < 1) {
        return <div className={styles.unauthorized}>Access denied</div>;
    }

    return (
        <div className={styles.paymentRequestsTab}>
            <div className={styles.header}>
                <h2>Payment Management</h2>
                <div className={styles.filterControls}>
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="failed">Failed</option>
                        <option value="">All</option>
                    </select>
                    <div className={styles.stats}>
                        {payments.length} payment{payments.length !== 1 ? 's' : ''} found
                    </div>
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading payments...</div>
            ) : payments.length === 0 ? (
                <div className={styles.noPayments}>
                    No {filter || 'payment'} requests found
                </div>
            ) : (
                <div className={styles.paymentsList}>
                    {payments.map(payment => (
                        <div key={payment.payment_id} className={styles.paymentCard}>
                            <div className={styles.paymentHeader}>
                                <div className={styles.userInfo}>
                                    <h3>{getContentTitle(payment)}</h3>
                                    <p>{payment.user_name}</p>
                                    <p>{payment.user_email}</p>
                                </div>
                                <div className={styles.amountStatus}>
                                    <div className={styles.amount}>
                                        {formatAmount(payment.amount)}
                                    </div>
                                    {getStatusBadge(payment.status)}
                                </div>
                            </div>

                            <div className={styles.paymentDetails}>
                                <div className={styles.detailRow}>
                                    <strong>Entity Type:</strong> 
                                    {getEntityTypeDisplay(payment.entity_type)}
                                    {payment.entity_id && ` (ID: ${payment.entity_id})`}
                                </div>
                                <div className={styles.detailRow}>
                                    <strong>Payment ID:</strong> 
                                    #{payment.payment_id}
                                </div>
                                <div className={styles.detailRow}>
                                    <strong>Submitted:</strong> 
                                    {formatDate(payment.created_at)}
                                </div>
                                {payment.processed_at && (
                                    <div className={styles.detailRow}>
                                        <strong>Processed:</strong> 
                                        {formatDate(payment.processed_at)}
                                        {payment.processed_by_name && ` by ${payment.processed_by_name}`}
                                    </div>
                                )}
                            </div>

                            {payment.screenshot_path && (
                                <div className={styles.screenshotSection}>
                                    <strong>Payment Screenshot:</strong>
                                    <div className={styles.screenshotControls}>
                                        <button 
                                            onClick={() => setShowScreenshot(
                                                showScreenshot === payment.payment_id ? null : payment.payment_id
                                            )}
                                            className={styles.viewScreenshotBtn}
                                        >
                                            {showScreenshot === payment.payment_id ? 'Hide' : 'View'} Screenshot
                                        </button>
                                        <a 
                                            href={`/${payment.screenshot_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.downloadLink}
                                        >
                                            Download
                                        </a>
                                    </div>
                                    
                                    {showScreenshot === payment.payment_id && (
                                        <div className={styles.screenshotPreview}>
                                            <Image
                                                src={`/${payment.screenshot_path}`}
                                                alt="Payment Screenshot"
                                                width={400}
                                                height={300}
                                                style={{ objectFit: 'contain' }}
                                                className={styles.screenshotImg}
                                            />
                                        </div>
                                    )}
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
                                                placeholder="Optional admin notes (will be sent to user)..."
                                                className={styles.adminNotesInput}
                                                rows={3}
                                            />
                                            <div className={styles.processButtons}>
                                                <button 
                                                    onClick={() => processPayment(payment.payment_id, 'approve')}
                                                    disabled={processing}
                                                    className={styles.approveButton}
                                                >
                                                    {processing ? 'Processing...' : 'Approve & Grant Access'}
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

                            {payment.status === 'approved' && (
                                <div className={styles.approvedInfo}>
                                    <div className={styles.successMessage}>
                                        ✓ Payment approved and access granted
                                    </div>
                                </div>
                            )}

                            {payment.status === 'rejected' && (
                                <div className={styles.rejectedInfo}>
                                    <div className={styles.errorMessage}>
                                        ✗ Payment rejected
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
