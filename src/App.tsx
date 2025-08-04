import { useState, useEffect } from 'react'
import './App.css'
import EmailRequestForm from './components/EmailRequestForm'
import EmailSuccessNotification from './components/EmailSuccessNotification'
import OriginFilter from './components/OriginFilter'

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFileForEmail, setSelectedFileForEmail] = useState<FileInfo | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<EmailSuccess | null>(null);
  const [appMode, setAppMode] = useState<'upload' | 'tablet'>('upload');
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all');
  const [originStats, setOriginStats] = useState<OriginStats[]>([]);

  const fetchFiles = async (origin: string = 'all') => {
    try {
      const url = origin === 'all' 
        ? `${API_BASE_URL}/api/files`
        : `${API_BASE_URL}/api/files?origin=${origin}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setAvailableOrigins(data.availableOrigins || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const fetchOriginStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/origins`);
      if (response.ok) {
        const data = await response.json();
        setOriginStats(data.origins || []);
      }
    } catch (error) {
      console.error('Error fetching origin stats:', error);
    }
  };

  useEffect(() => {
    fetchFiles(selectedOrigin);
    fetchOriginStats();
  }, [selectedOrigin]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchFiles(selectedOrigin); // Refresh file list
        await fetchOriginStats(); // Refresh origin stats
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
      const response = await fetch(`${API_BASE_URL}/api/files/${filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchFiles(selectedOrigin); // Refresh file list
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

  const handleEmailRequest = (file: FileInfo) => {
    setSelectedFileForEmail(file);
  };

  const handleCloseModal = () => {
    setSelectedFileForEmail(null);
  };

  const handleCloseNotification = () => {
    setEmailSuccess(null);
  };

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
        </section>

        <section className="files-section">
          <h2>
            {appMode === 'upload' ? '📋 File List' : '📧 Select File to Email'} 
            {selectedOrigin === 'all' 
              ? ` (${files.length} files total)` 
              : ` (${files.length} files from Headset ${selectedOrigin})`
            }
          </h2>
          {files.length === 0 ? (
            <p className="no-files">
              {selectedOrigin === 'all'
                ? (appMode === 'upload' 
                    ? 'No files uploaded yet. Upload your first file above!' 
                    : 'No files available for email requests.')
                : `No files from Headset ${selectedOrigin}.`
              }
            </p>
          ) : (
            <div className="files-grid">
              {files.map((file) => (
                <div key={file.name} className="file-card">
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
                  <div className="file-actions">
                    {appMode === 'upload' ? (
                      <>
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
                      </>
                    ) : (
                      <button
                        onClick={() => handleEmailRequest(file)}
                        className="email-button"
                      >
                        📧 Request Email
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Email Request Modal */}
      {selectedFileForEmail && (
        <EmailRequestForm
          file={selectedFileForEmail}
          onClose={handleCloseModal}
          onSuccess={(jobId, email) => {
            setEmailSuccess({ jobId, email, filename: selectedFileForEmail.name });
            setSelectedFileForEmail(null);
          }}
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
