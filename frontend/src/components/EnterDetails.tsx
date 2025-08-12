import React, { useState } from 'react';

interface FileInfo {
  name: string;
  originalName: string;
  size: number;
  uploadDate: string;
  origin: string;
  path: string;
}

interface EnterDetailsProps {
  file: FileInfo;
  onBack: () => void;
  onSend: (email: string, options: EmailOptions) => void;
}

interface EmailOptions {
  stayInTouch: boolean;
  includeScreenshots: boolean;
  include3DModels: boolean;
}

const EnterDetails: React.FC<EnterDetailsProps> = ({ file, onBack, onSend }) => {
  const [email, setEmail] = useState('');
  const [options, setOptions] = useState<EmailOptions>({
    stayInTouch: false,
    includeScreenshots: true,
    include3DModels: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSend(email.trim(), options);
    } catch (error) {
      setError('Failed to send request. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleOptionChange = (option: keyof EmailOptions) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  return (
    <div className="enter-details-overlay">
      <div className="enter-details-modal">
        <div className="enter-details-header">
          <button onClick={onBack} className="back-button">
            ← Back
          </button>
          <h2>📧 Enter Details</h2>
        </div>

        <div className="enter-details-content">
          {/* File Preview */}
          <div className="file-preview-card">
            <h3>Selected File</h3>
            <div className="file-preview-info">
              <div className="file-preview-name">{file.originalName || file.name}</div>
              <div className="file-preview-meta">
                <span className="file-preview-size">{formatFileSize(file.size)}</span>
                <span className="file-preview-date">
                  {new Date(file.uploadDate).toLocaleDateString()}
                </span>
                <span className="file-preview-origin">📡 Headset {file.origin}</span>
              </div>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="details-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="email-input"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Options */}
            <div className="form-group">
              <label>Options</label>
              <div className="options-list">
                <label className="option-item">
                  <input
                    type="checkbox"
                    checked={options.stayInTouch}
                    onChange={() => handleOptionChange('stayInTouch')}
                    disabled={isSubmitting}
                  />
                  <span className="option-label">
                    📬 Stay in touch
                    <small>Allow future contact about updates and new features</small>
                  </span>
                </label>

                <label className="option-item">
                  <input
                    type="checkbox"
                    checked={options.includeScreenshots}
                    onChange={() => handleOptionChange('includeScreenshots')}
                    disabled={isSubmitting}
                  />
                  <span className="option-label">
                    📸 Include Screenshots
                    <small>Add screenshots to the file package</small>
                  </span>
                </label>

                <label className="option-item">
                  <input
                    type="checkbox"
                    checked={options.include3DModels}
                    onChange={() => handleOptionChange('include3DModels')}
                    disabled={isSubmitting}
                  />
                  <span className="option-label">
                    🎨 Include 3D Models
                    <small>Add 3D model files to the package</small>
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                type="button"
                onClick={onBack}
                className="cancel-button"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="send-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner-small"></div>
                    Sending...
                  </>
                ) : (
                  '📧 SEND'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnterDetails;
