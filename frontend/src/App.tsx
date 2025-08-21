import { useState, useEffect } from 'react'
import socket from './socket';
import './App.css'
import EmailSuccessNotification from './components/EmailSuccessNotification'
import OriginFilter from './components/OriginFilter'
import EnterDetails from './components/EnterDetails'

interface FileInfo {
  name: string;
  originalName: string;
  size: number;
  uploadDate: string;
  origin: string;
  path: string;
}

interface EmailSuccess {
  jobId: string;
  email: string;
  filename: string;
}

interface OriginStats {
  alias: string;
  fileCount: number;
  totalSize: number;
  lastUpload: number | null;
}

interface EmailOptions {
  stayInTouch: boolean;
  includeScreenshots: boolean;
  include3DModels: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/files';

function App() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<FileInfo | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<EmailSuccess | null>(null);
  const [appMode, setAppMode] = useState<'upload' | 'tablet'>('upload');
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all');
  const [originStats, setOriginStats] = useState<OriginStats[]>([]);
  const [timeFilter, setTimeFilter] = useState<'all' | 'recent'>('all');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Effect to update current time for filtering
  useEffect(() => {
    if (timeFilter === 'recent') {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000); // Update every second
      return () => clearInterval(interval);
    }
  }, [timeFilter]);

  // Listen for socket updates
  useEffect(() => {
    socket.on('files_updated', (data) => {
      setFiles(data.files || []);
      setAvailableOrigins(data.availableOrigins || []);
    });
    // Initial fetch (optional, or wait for first socket event)
    socket.emit('get_files', { origin: selectedOrigin });
    return () => {
      socket.off('files_updated');
    };
  }, [selectedOrigin]);

  const fetchOriginStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/origins`);
      if (response.ok) {
        const data = await response.json();
        setOriginStats(data.origins || []);
      }
    } catch (error) {
      console.error('Error fetching origin stats:', error);
    }
  };

  useEffect(() => {
    // fetchFiles(selectedOrigin);
    fetchOriginStats();
  }, [selectedOrigin]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        // No need to manually refresh file list; socket event will update
        await fetchOriginStats();
        console.log('File uploaded successfully');
      } else {
        console.error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles[0]) {
      handleFileUpload(selectedFiles[0]);
    }
  };

  const deleteFile = async (filename: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // await fetchFiles(selectedOrigin); // Refresh file list
        await fetchOriginStats(); // Refresh origin stats
        console.log('File deleted successfully');
      } else {
        console.error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileCardClick = (file: FileInfo) => {
    if (appMode === 'tablet') {
      setSelectedFileForDetails(file);
    }
  };

  const handleDetailsBack = () => {
    setSelectedFileForDetails(null);
  };

  const handleDetailsSend = async (email: string, options: EmailOptions) => {
    if (!selectedFileForDetails) return;

    try {
      const response = await fetch(`${API_BASE_URL}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          filename: selectedFileForDetails.name,
          options
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setEmailSuccess({
          jobId: result.jobId,
          email,
          filename: selectedFileForDetails.name
        });
        setSelectedFileForDetails(null);
      } else {
        throw new Error('Failed to send email request');
      }
    } catch (error) {
      console.error('Email request error:', error);
      throw error;
    }
  };

  const handleCloseNotification = () => {
    setEmailSuccess(null);
  };

  // Filter files based on time criteria (Recent = last 3 minutes)
  const getFilteredFiles = () => {
    if (timeFilter === 'recent') {
      const threeMinutesAgo = new Date(currentTime - 3 * 60 * 1000);
      return files.filter(file => new Date(file.uploadDate) >= threeMinutesAgo);
    }
    return files;
  };

  const filteredFiles = getFilteredFiles();

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎨 NeonBrush File Server</h1>
        <p>Upload, manage, and share your files</p>
        
        <div className="mode-selector">
          <button 
            className={`mode-button ${appMode === 'upload' ? 'active' : ''}`}
            onClick={() => setAppMode('upload')}
          >
            📁 Upload Mode
          </button>
          <button 
            className={`mode-button ${appMode === 'tablet' ? 'active' : ''}`}
            onClick={() => setAppMode('tablet')}
          >
            📧 Tablet Mode
          </button>
        </div>
      </header>

      <main className="main-content">
        {appMode === 'upload' && (
          <section className="upload-section">
            <div
              className={`upload-area ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="upload-content">
                {uploading ? (
                  <div className="uploading">
                    <div className="spinner"></div>
                    <p>Uploading...</p>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">📁</div>
                    <p>Drag & drop files here or</p>
                    <label className="file-input-label">
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                      <button className="upload-button">Choose Files</button>
                    </label>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Origin Filter Section */}
        <section className="filter-section">
          <OriginFilter
            availableOrigins={availableOrigins}
            selectedOrigin={selectedOrigin}
            onOriginChange={setSelectedOrigin}
            originStats={originStats}
          />
          
          {/* Time Filter Section - Only show in Tablet Mode */}
          {appMode === 'tablet' && (
            <div className="time-filter">
              <div className="filter-header">
                <h3>📅 Time Filter</h3>
              </div>
              <div className="time-buttons">
                <button 
                  className={`time-button ${timeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTimeFilter('all')}
                >
                  <div className="time-info">
                    <div className="time-label">All Files</div>
                    <div className="time-count">{files.length} files</div>
                  </div>
                </button>
                <button 
                  className={`time-button ${timeFilter === 'recent' ? 'active' : ''}`}
                  onClick={() => setTimeFilter('recent')}
                >
                  <div className="time-info">
                    <div className="time-label">Recent (3 min)</div>
                    <div className="time-count">{filteredFiles.length} files</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="files-section">
          <h2>
            {appMode === 'upload' ? '📋 File List' : '📧 Select File to Email'} 
            {selectedOrigin === 'all' 
              ? ` (${filteredFiles.length} files${appMode === 'tablet' && timeFilter === 'recent' ? ' in last 3 min' : ' total'})` 
              : ` (${filteredFiles.length} files from Headset ${selectedOrigin}${appMode === 'tablet' && timeFilter === 'recent' ? ' in last 3 min' : ''})`
            }
          </h2>
          {filteredFiles.length === 0 ? (
            <p className="no-files">
              {timeFilter === 'recent' && appMode === 'tablet'
                ? 'No files uploaded in the last 3 minutes.'
                : (selectedOrigin === 'all'
                  ? (appMode === 'upload' 
                      ? 'No files uploaded yet. Upload your first file above!' 
                      : 'No files available for email requests.')
                  : `No files from Headset ${selectedOrigin}.`
                )
              }
            </p>
          ) : (
            <div className="files-grid">
              {filteredFiles.map((file) => (
                <div 
                  key={file.name} 
                  className={`file-card ${appMode === 'tablet' ? 'clickable-file-card' : ''}`}
                  onClick={() => appMode === 'tablet' ? handleFileCardClick(file) : undefined}
                >
                  <div className="file-info">
                    <h3 className="file-name">{file.originalName || file.name}</h3>
                    <div className="file-meta">
                      <p className="file-size">{formatFileSize(file.size)}</p>
                      <p className="file-date">
                        {new Date(file.uploadDate).toLocaleDateString()}
                      </p>
                      <p className="file-origin">📡 Headset {file.origin}</p>
                    </div>
                  </div>
                  {appMode === 'upload' && (
                    <div className="file-actions">
                      <a
                        href={`${API_BASE_URL}${file.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="download-button"
                      >
                        📥 Download
                      </a>
                      <button
                        onClick={() => deleteFile(file.name)}
                        className="delete-button"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                  {appMode === 'tablet' && (
                    <div className="tablet-hint">
                      <p>👆 Tap to request this file</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Enter Details Modal */}
      {selectedFileForDetails && (
        <EnterDetails
          file={selectedFileForDetails}
          onBack={handleDetailsBack}
          onSend={handleDetailsSend}
        />
      )}

      {/* Email Success Notification */}
      {emailSuccess && (
        <EmailSuccessNotification
          jobId={emailSuccess.jobId}
          email={emailSuccess.email}
          filename={emailSuccess.filename}
          onClose={handleCloseNotification}
        />
      )}
    </div>
  )
}

export default App
