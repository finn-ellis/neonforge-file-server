import React from 'react';

interface OriginStats {
  alias: string;
  fileCount: number;
  totalSize: number;
  lastUpload: number | null;
}

interface OriginFilterProps {
  availableOrigins: string[];
  selectedOrigin: string;
  onOriginChange: (origin: string) => void;
  originStats: OriginStats[];
}

const OriginFilter: React.FC<OriginFilterProps> = ({
  availableOrigins,
  selectedOrigin,
  onOriginChange,
  originStats
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatsForOrigin = (origin: string) => {
    return originStats.find(stat => stat.alias === origin);
  };

  return (
    <div className="origin-filter">
      <div className="filter-header">
        <h3>🎯 Filter by Headset</h3>
      </div>
      
      <div className="origin-buttons">
        <button
          className={`origin-button ${selectedOrigin === 'all' ? 'active' : ''}`}
          onClick={() => onOriginChange('all')}
        >
          <div className="origin-info">
            <span className="origin-label">📋 All Headsets</span>
            <span className="origin-count">
              {originStats.reduce((sum, stat) => sum + stat.fileCount, 0)} files
            </span>
          </div>
        </button>
        
        {availableOrigins.map((origin) => {
          const stats = getStatsForOrigin(origin);
          return (
            <button
              key={origin}
              className={`origin-button ${selectedOrigin === origin ? 'active' : ''}`}
              onClick={() => onOriginChange(origin)}
            >
              <div className="origin-info">
                <span className="origin-label">🎧 Headset {origin}</span>
                {stats && (
                  <div className="origin-stats">
                    <span className="origin-count">{stats.fileCount} files</span>
                    <span className="origin-size">{formatFileSize(stats.totalSize)}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {availableOrigins.length === 0 && (
        <div className="no-origins">
          <p>No headsets have uploaded files yet.</p>
        </div>
      )}
    </div>
  );
};

export default OriginFilter;
