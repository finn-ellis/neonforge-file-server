import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import EmailService from './emailService';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize email service
const emailService = new EmailService();

// Origin tracking - maps IP addresses to simple aliases
const originAliases = new Map<string, string>();
let nextAliasIndex = 1;

// Function to get or create alias for an IP address
const getOriginAlias = (ipAddress: string): string => {
  if (!originAliases.has(ipAddress)) {
    const alias = `H${nextAliasIndex}`; // H1, H2, H3, H4 for headsets
    originAliases.set(ipAddress, alias);
    nextAliasIndex++;
    console.log(`🔗 New headset registered: ${ipAddress} -> ${alias}`);
  }
  return originAliases.get(ipAddress)!;
};

// Function to get client IP address
const getClientIP = (req: express.Request): string => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection as any)?.socket?.remoteAddress || 
         req.headers['x-forwarded-for']?.toString().split(',')[0] || 
         'unknown';
};

// Middleware
app.set('trust proxy', true); // Enable IP address tracking
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const metadataDir = path.join(__dirname, '../metadata');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(metadataDir)) {
  fs.mkdirSync(metadataDir, { recursive: true });
}

// File metadata interface
interface FileMetadata {
  filename: string;
  originalName: string;
  size: number;
  uploadDate: Date;
  origin: string;
  originAlias: string;
  clientIP: string;
}

// Function to save file metadata
const saveFileMetadata = (metadata: FileMetadata): void => {
  const metadataPath = path.join(metadataDir, `${metadata.filename}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
};

// Function to load file metadata
const loadFileMetadata = (filename: string): FileMetadata | null => {
  const metadataPath = path.join(metadataDir, `${filename}.json`);
  if (fs.existsSync(metadataPath)) {
    try {
      const data = fs.readFileSync(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading metadata for ${filename}:`, error);
    }
  }
  return null;
};

// Function to load all file metadata
const loadAllFileMetadata = (): FileMetadata[] => {
  const metadataFiles = fs.readdirSync(metadataDir).filter(file => file.endsWith('.json'));
  const allMetadata: FileMetadata[] = [];
  
  for (const metadataFile of metadataFiles) {
    const filename = metadataFile.replace('.json', '');
    const metadata = loadFileMetadata(filename);
    if (metadata) {
      // Verify the actual file still exists
      const filePath = path.join(uploadsDir, metadata.filename);
      if (fs.existsSync(filePath)) {
        allMetadata.push(metadata);
      } else {
        // Clean up orphaned metadata
        const metadataPath = path.join(metadataDir, metadataFile);
        fs.unlinkSync(metadataPath);
      }
    }
  }
  
  return allMetadata;
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const clientIP = getClientIP(req);
    const originAlias = getOriginAlias(clientIP);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${originAlias}_${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NeonBrush File Server is running',
    timestamp: new Date().toISOString(),
    registeredOrigins: Array.from(originAliases.entries()).map(([ip, alias]) => ({ ip, alias }))
  });
});

app.get('/api/files', (req, res) => {
  try {
    const { origin } = req.query; // Optional filter by origin
    const allMetadata = loadAllFileMetadata();
    
    let filteredMetadata = allMetadata;
    if (origin && typeof origin === 'string') {
      filteredMetadata = allMetadata.filter(metadata => metadata.originAlias === origin);
    }
    
    // Sort by upload date (newest first)
    filteredMetadata.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    
    const fileList = filteredMetadata.map(metadata => ({
      name: metadata.filename,
      originalName: metadata.originalName,
      size: metadata.size,
      uploadDate: metadata.uploadDate,
      origin: metadata.originAlias,
      path: `/api/files/${metadata.filename}`
    }));
    
    res.json({
      files: fileList,
      totalFiles: fileList.length,
      availableOrigins: [...new Set(allMetadata.map(m => m.originAlias))].sort()
    });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Failed to read files directory' });
  }
});

app.get('/api/origins', (req, res) => {
  try {
    const allMetadata = loadAllFileMetadata();
    const origins = [...new Set(allMetadata.map(m => m.originAlias))].sort();
    const originStats = origins.map(alias => {
      const files = allMetadata.filter(m => m.originAlias === alias);
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      return {
        alias,
        fileCount: files.length,
        totalSize,
        lastUpload: files.length > 0 ? Math.max(...files.map(f => new Date(f.uploadDate).getTime())) : null
      };
    });
    
    res.json({
      origins: originStats,
      registeredIPs: Array.from(originAliases.entries()).map(([ip, alias]) => ({ ip, alias }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get origin information' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const clientIP = getClientIP(req);
    const originAlias = getOriginAlias(clientIP);
    
    // Save file metadata
    const metadata: FileMetadata = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadDate: new Date(),
      origin: clientIP,
      originAlias: originAlias,
      clientIP: clientIP
    };
    
    saveFileMetadata(metadata);
    
    console.log(`📁 File uploaded from ${originAlias} (${clientIP}): ${req.file.originalname}`);
    
    res.json({
      message: 'File uploaded successfully',
      file: {
        name: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        origin: originAlias,
        path: `/api/files/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.get('/api/files/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

app.delete('/api/files/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    const metadataPath = path.join(metadataDir, `${filename}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    // Delete the metadata
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }
    
    console.log(`🗑️ File deleted: ${filename}`);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Email endpoints
app.post('/api/email/send', async (req, res) => {
  try {
    const { email, filename } = req.body;
    
    if (!email || !filename) {
      return res.status(400).json({ error: 'Email and filename are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const jobId = await emailService.queueEmail(email, filename, filePath);
    
    res.json({
      message: 'Email queued successfully',
      jobId,
      email,
      filename
    });
  } catch (error) {
    console.error('Email queue error:', error);
    res.status(500).json({ error: 'Failed to queue email' });
  }
});

app.get('/api/email/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = emailService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({
      id: job.id,
      email: job.email,
      filename: job.filename,
      status: job.status,
      timestamp: job.timestamp,
      retryCount: job.retryCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

app.get('/api/email/queue', (req, res) => {
  try {
    const queueStatus = emailService.getQueueStatus();
    res.json(queueStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 NeonBrush File Server is running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});
