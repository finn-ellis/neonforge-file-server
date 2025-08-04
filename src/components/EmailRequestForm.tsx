import React, { useState } from 'react';

interface FileInfo {
  name: string;
  size: number;
  uploadDate: string;
  path: string;
}

interface EmailRequestFormProps {
  file: FileInfo;
  onClose: () => void;
  onSuccess: (jobId: string, email: string) => void;
}

const EmailRequestForm: React.FC<EmailRequestFormProps> = ({ file, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          filename: file.name,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onSuccess(result.jobId, email);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send email request');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="email-modal-overlay">
      <div className="email-modal">
        <div className="email-modal-header">
          <h2>📧 Email File Request</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="email-modal-content">
          <div className="file-preview">
            <h3>📁 Selected File</h3>
            <div className="file-info-card">
              <p><strong>Name:</strong> {file.name}</p>
              <p><strong>Size:</strong> {formatFileSize(file.size)}</p>
              <p><strong>Date:</strong> {new Date(file.uploadDate).toLocaleDateString()}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="email-form">
            <div className="form-group">
              <label htmlFor="email">📧 Your Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner-small"></div>
                    Sending Request...
                  </>
                ) : (
                  '📧 Send Email Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailRequestForm;
