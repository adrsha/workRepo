import React from 'react';

const TeacherSignupPopup = ({ isOpen, onClose, isPreview = false }) => {
    if (!isOpen) return null;

    return (
        <div className="popup-overlay">
            <div className="popup-content">
                {/* Close button in header */}
                <div className="popup-header">
                    <h2>{isPreview ? 'Teacher Registration Process' : 'Registration Successful!'}</h2>
                    <button 
                        onClick={onClose} 
                        className="close-x-button"
                        title="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="popup-body">
                    <div className="success-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#00b87d" />
                            <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <p className="main-message">
                        <strong>{isPreview ? 'Here\'s what happens after you register as a teacher:' : 'Welcome to MeroTuition!'}</strong>
                    </p>

                    <div className="info-section">
                        <h3>📧 Secret Key Sent</h3>
                        <p>
                            A secret key {isPreview ? 'will be' : 'has been'} sent to your email address. Please keep this key safe
                            as you'll need to share it with the admin for verification.
                        </p>
                    </div>

                    <div className="info-section">
                        <h3>⏳ Admin Review</h3>
                        <p>
                            Your signup request {isPreview ? 'will be' : 'has been'} submitted to our admin team. They will review
                            your application and soon accept or reject your request. You will receive a notification via your email.
                        </p>
                    </div>

                    <div className="next-steps">
                        <h4>Next Steps:</h4>
                        <ol>
                            <li>Check your email for the secret key</li>
                            <li>Wait for admin to accept your request.</li>
                            <li>Share your secret key when requested</li>
                            <li>Start teaching once approved!</li>
                        </ol>
                    </div>
                </div>

                <div className="popup-footer">
                    <button onClick={onClose} className="close-button">
                        {isPreview ? 'Got it!' : 'Continue to Login'}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-in-out;
        }
        
        .popup-content {
          background: white;
          border-radius: 12px;
          padding: 0;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
          position: relative;
        }
        
        .popup-header {
          background: linear-gradient(135deg, #3db0b7, #00b87d);
          color: white;
          padding: 1.5rem;
          text-align: center;
          border-radius: 12px 12px 0 0;
          position: relative;
        }
        
        .popup-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          padding-right: 2rem;
        }
        
        .close-x-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: white;
          font-size: 2rem;
          cursor: pointer;
          padding: 0;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s ease;
        }
        
        .close-x-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        .popup-body {
          padding: 2rem;
          text-align: center;
        }
        
        .success-icon {
          margin-bottom: 1rem;
        }
        
        .main-message {
          font-size: 1.2rem;
          color: #3d4752;
          margin-bottom: 1.5rem;
        }
        
        .info-section {
          background: #f8fafc;
          border-left: 4px solid #3db0b7;
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 0 8px 8px 0;
          text-align: left;
        }
        
        .info-section h3 {
          margin: 0 0 0.5rem 0;
          color: #3d4752;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .info-section p {
          margin: 0;
          color: #64748b;
          line-height: 1.5;
        }
        
        .next-steps {
          background: #f0f9ff;
          border: 1px solid #e0f2fe;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1.5rem;
          text-align: left;
        }
        
        .next-steps h4 {
          margin: 0 0 0.5rem 0;
          color: #3d4752;
          font-weight: 600;
        }
        
        .next-steps ol {
          margin: 0;
          padding-left: 1.2rem;
          color: #64748b;
        }
        
        .next-steps li {
          margin-bottom: 0.3rem;
          line-height: 1.4;
        }
        
        .popup-footer {
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }
        
        .close-button {
          background: #3db0b7;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .close-button:hover {
          background: #00b87d;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 768px) {
          .popup-content {
            width: 95%;
            margin: 1rem;
          }
          
          .popup-body {
            padding: 1.5rem;
          }
          
          .popup-header {
            padding: 1.25rem;
          }
          
          .popup-header h2 {
            font-size: 1.3rem;
          }
          
          .close-x-button {
            top: 0.75rem;
            right: 0.75rem;
            font-size: 1.5rem;
            width: 1.5rem;
            height: 1.5rem;
          }
        }
      `}</style>
        </div>
    );
};

export default TeacherSignupPopup;
