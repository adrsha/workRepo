// ContentRequestManager.jsx
import { useState } from 'react';
import styles from '@/styles/ContentRequestManager.module.css';

export const ContentRequestManager = ({ 
    entityType,
    entityId,
    entityContent,
    requests,
    isAdmin,
    onRequestAccess,
    onProcessRequest,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState(isAdmin ? 'requests' : 'new');
    const [requestMessage, setRequestMessage] = useState('');
    const [selectedContentId, setSelectedContentId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('pending');
    
    console.log("ENTITY", entityContent)
    const restrictedContent = entityContent.filter(item => 
        item.content_id && (!item.user_has_access || item.user_has_access === 0)
    );

    const filteredRequests = requests.filter(request => 
        statusFilter === 'all' || request.status === statusFilter
    );

    const handleSubmitRequest = async (type) => {
        if (loading) return;
        
        setLoading(true);
        try {
            await onRequestAccess(
                type === 'content' ? selectedContentId : null,
                type,
                requestMessage
            );
            setRequestMessage('');
            setSelectedContentId(null);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessRequest = async (requestId, action) => {
        if (loading) return;

        setLoading(true);
        try {
            await onProcessRequest(requestId, action, adminNotes);
            setAdminNotes('');
            setSelectedRequestId(null);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            pending: { className: styles.pendingBadge, text: 'Pending' },
            approved: { className: styles.approvedBadge, text: 'Approved' },
            rejected: { className: styles.rejectedBadge, text: 'Rejected' }
        };
        const config = statusMap[status] || statusMap.pending;
        return <span className={config.className}>{config.text}</span>;
    };

    const getContentTypeDisplay = (contentType) => {
        if (!contentType) return 'Unknown';
        return contentType.charAt(0).toUpperCase() + contentType.slice(1);
    };

    const getEntityName = () => {
        return entityType.slice(0, -1); // Remove 's' from plural
    };

    return (
        <div className={styles.modal}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>Content Access Management</h3>
                    <button onClick={onClose} className={styles.closeButton}>×</button>
                </div>

                <div className={styles.tabButtons}>
                    {!isAdmin && (
                        <button 
                            onClick={() => setActiveTab('new')}
                            className={activeTab === 'new' ? styles.activeTab : styles.tab}
                        >
                            New Request
                        </button>
                    )}
                    <button 
                        onClick={() => setActiveTab('requests')}
                        className={activeTab === 'requests' ? styles.activeTab : styles.tab}
                    >
                        {isAdmin ? 'Manage Requests' : 'My Requests'}
                        {requests.filter(r => r.status === 'pending').length > 0 && (
                            <span className={styles.pendingCount}>
                                {requests.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'new' && !isAdmin && (
                    <div className={styles.newRequestSection}>
                        <div className={styles.requestTypeSection}>
                            <h4>Request Full Access</h4>
                            <p className={styles.requestDescription}>
                                Request access to all content in this {getEntityName()}
                            </p>
                            <button 
                                onClick={() => handleSubmitRequest('entity')}
                                disabled={loading}
                                className={styles.requestTypeButton}
                            >
                                {loading ? 'Submitting...' : 'Request All Content Access'}
                            </button>
                        </div>

                        {restrictedContent.length > 0 && (
                            <div className={styles.individualRequestSection}>
                                <h4>Request Specific Content</h4>
                                <p className={styles.requestDescription}>
                                    Choose a specific piece of content to request access to
                                </p>
                                <select 
                                    value={selectedContentId || ''}
                                    onChange={(e) => setSelectedContentId(e.target.value || null)}
                                    className={styles.contentSelect}
                                >
                                    <option value="">Select content...</option>
                                    {restrictedContent.map(content => (
                                        <option key={content.content_id} value={content.content_id}>
                                            {getContentTypeDisplay(content.content_type)} - {formatDate(content.created_at)}
                                        </option>
                                    ))}
                                </select>
                                
                                {selectedContentId && (
                                    <button 
                                        onClick={() => handleSubmitRequest('content')}
                                        disabled={loading}
                                        className={styles.requestButton}
                                    >
                                        {loading ? 'Submitting...' : 'Request Selected Content'}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className={styles.messageSection}>
                            <label htmlFor="requestMessage">Optional Message:</label>
                            <textarea
                                id="requestMessage"
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value)}
                                placeholder="Explain why you need access (optional)..."
                                className={styles.messageTextarea}
                                rows={3}
                                maxLength={500}
                            />
                            <small className={styles.characterCount}>
                                {requestMessage.length}/500 characters
                            </small>
                        </div>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className={styles.requestsSection}>
                        <div className={styles.requestsHeader}>
                            <h4>
                                {isAdmin ? 'All Requests' : 'Your Requests'} 
                                ({filteredRequests.length})
                            </h4>
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={styles.statusFilter}
                            >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="all">All Status</option>
                            </select>
                        </div>

                        <div className={styles.requestsList}>
                            {filteredRequests.length === 0 ? (
                                <div className={styles.noRequests}>
                                    No {statusFilter === 'all' ? '' : statusFilter} requests found
                                </div>
                            ) : (
                                filteredRequests.map(request => (
                                    <div key={request.request_id} className={styles.requestItem}>
                                        <div className={styles.requestHeader}>
                                            <div className={styles.requestInfo}>
                                                {isAdmin && (
                                                    <div className={styles.userInfo}>
                                                        <strong>{request.user_name}</strong>
                                                        <span className={styles.userEmail}>({request.user_email})</span>
                                                    </div>
                                                )}
                                                <div className={styles.requestDetails}>
                                                    <span className={styles.requestType}>
                                                        {request.request_type === 'entity' ? 'Full Access' : 'Content Access'}
                                                    </span>
                                                    <span className={styles.requestDate}>
                                                        {formatDate(request.requested_at)}
                                                    </span>
                                                </div>
                                                {request.entity_title && (
                                                    <div className={styles.entityInfo}>
                                                        {getEntityName()}: {request.entity_title}
                                                    </div>
                                                )}
                                            </div>
                                            {getStatusBadge(request.status)}
                                        </div>
                                        
                                        {request.message && (
                                            <div className={styles.requestMessage}>
                                                <strong>Message:</strong> 
                                                <p>{request.message}</p>
                                            </div>
                                        )}

                                        {request.admin_notes && (
                                            <div className={styles.adminNotesDisplay}>
                                                <strong>Admin Response:</strong> 
                                                <p>{request.admin_notes}</p>
                                            </div>
                                        )}

                                        {request.processed_at && (
                                            <div className={styles.processedInfo}>
                                                <small>
                                                    Processed: {formatDate(request.processed_at)}
                                                    {request.processed_by_name && ` by ${request.processed_by_name}`}
                                                </small>
                                            </div>
                                        )}

                                        {isAdmin && request.status === 'pending' && (
                                            <div className={styles.adminActions}>
                                                {selectedRequestId === request.request_id ? (
                                                    <div className={styles.adminProcessForm}>
                                                        <textarea
                                                            value={adminNotes}
                                                            onChange={(e) => setAdminNotes(e.target.value)}
                                                            placeholder="Optional response message to user..."
                                                            className={styles.adminNotesTextarea}
                                                            rows={2}
                                                            maxLength={250}
                                                        />
                                                        <small className={styles.characterCount}>
                                                            {adminNotes.length}/250 characters
                                                        </small>
                                                        <div className={styles.actionButtons}>
                                                            <button 
                                                                onClick={() => handleProcessRequest(request.request_id, 'approve')}
                                                                disabled={loading}
                                                                className={styles.approveButton}
                                                            >
                                                                {loading ? 'Processing...' : 'Approve'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleProcessRequest(request.request_id, 'reject')}
                                                                disabled={loading}
                                                                className={styles.rejectButton}
                                                            >
                                                                {loading ? 'Processing...' : 'Reject'}
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedRequestId(null);
                                                                    setAdminNotes('');
                                                                }}
                                                                disabled={loading}
                                                                className={styles.cancelButton}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={styles.quickActions}>
                                                        <button 
                                                            onClick={() => handleProcessRequest(request.request_id, 'approve')}
                                                            disabled={loading}
                                                            className={styles.quickApprove}
                                                        >
                                                            Quick Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => setSelectedRequestId(request.request_id)}
                                                            className={styles.detailedProcess}
                                                        >
                                                            Process with Message
                                                        </button>
                                                        <button 
                                                            onClick={() => handleProcessRequest(request.request_id, 'reject')}
                                                            disabled={loading}
                                                            className={styles.quickReject}
                                                        >
                                                            Quick Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div className={styles.modalActions}>
                    <button onClick={onClose} className={styles.closeModalButton}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
