import React, { useEffect } from 'react';

interface EmailSuccessNotificationProps {
  jobId: string;
  email: string;
  filename: string;
  onClose: () => void;
}

const EmailSuccessNotification: React.FC<EmailSuccessNotificationProps> = ({
  jobId,
  email,
  filename,
  onClose
}) => {
  useEffect(() => {
    // Auto close after 10 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="notification-overlay">
      <div className="notification success-notification">
        <div className="notification-header">
          <div className="success-icon">✅</div>
          <h3>Email Request Sent!</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="notification-content">
          <p><strong>📧 Email:</strong> {email}</p>
          <p><strong>📁 File:</strong> {filename}</p>
          <p><strong>🆔 Job ID:</strong> {jobId}</p>
          
          <div className="notification-message">
            <p>Your file request has been queued successfully! You'll receive an email with the file attachment shortly.</p>
            <p className="small-text">This notification will disappear automatically in 10 seconds.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSuccessNotification;
