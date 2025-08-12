# 🎨✨ Features

- 📁 **File Upload**: Drag & drop or click to upload files
- 📋 **File Management**: View, download, and delete files
- 📧 **Email File Sharing**: Request files via email (perfect for tablet users)
- 🎯 **Origin Filtering**: Classify and filter files by their source headset (H1, H2, H3, H4)
- ⏰ **Recent Filter**: Show only files uploaded in the last 3 minutes (Tablet Mode)
- 🎛️ **Dual Mode Interface**: Upload mode for headsets, Tablet mode for email requests
- 🏷️ **Smart File Naming**: Files are automatically prefixed with headset identifiers
- 📮 **Offline Email Queue**: Email requests are saved to disk for processing after events
- 🎨 **Modern UI**: Beautiful gradient design with responsive layout
- 🐳 **Containerized**: Full Docker support for easy deployment
- 🔒 **Secure**: CORS protection and file validation
- ⚡ **Fast**: Built with Vite for lightning-fast development

## 🏗️ Architecture

The application works in a local network environment where:
- **Headsets** upload files via the upload interface (automatically assigned aliases H1, H2, H3, H4)
- **Tablets** request files via email using the tablet interface
- **Origin Tracking** automatically identifies and categorizes files by their source
- **Email Server** automatically sends files as attachments when requested

## 🎯 Origin Classification

Files are automatically classified by their upload source:
- Each headset IP address gets a simple alias (H1, H2, H3, H4)
- Files are prefixed with the headset identifier (e.g., `H1_file-12345.jpg`)
- Filter interface allows viewing files from specific headsets or all headsets
- Origin statistics show file count and total size per headseterver

A modern, containerized file server application built with React TypeScript frontend and Node.js Express backend.

## ✨ Features

- 📁 **File Upload**: Drag & drop or click to upload files
- 📋 **File Management**: View, download, and delete files
- 📧 **Email File Sharing**: Request files via email (perfect for tablet users)
- �️ **Dual Mode Interface**: Upload mode for headsets, Tablet mode for email requests
- �🎨 **Modern UI**: Beautiful gradient design with responsive layout
- 🐳 **Containerized**: Full Docker support for easy deployment
- 🔒 **Secure**: CORS protection and file validation
- ⚡ **Fast**: Built with Vite for lightning-fast development

## 🏗️ Architecture

The application works in a local network environment where:
- **Headsets** upload files via the upload interface
- **Tablets** request files via email using the tablet interface
- **Email Server** automatically sends files as attachments when requested

```
NeonBrushFileServer/
├── frontend/                    # React TypeScript frontend
├── file_server/                 # Python Flask backend
├── .github/                     # GitHub configurations
└── README.md
```

## 🚀 Quick Start

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files/health` | Health check with registered origins |
| GET | `/api/files/all` | List all uploaded files (supports `?origin=H1` filter) |
| GET | `/api/files/origins` | Get origin statistics and registered headsets |
| POST | `/api/files/upload` | Upload a file (automatically tagged with origin) |
| GET | `/api/files/:filename` | Download a specific file |
| DELETE | `/api/files/:filename` | Delete a specific file |
| POST | `/api/files/email/send` | Queue email with file attachment |
| GET | `/api/files/email/status/:jobId` | Check email job status |
| GET | `/api/files/email/queue` | Get email queue statistics |

## 📧 Email Configuration

The application supports sending files via email. Configure your SMTP settings in the backend `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note**: If email credentials are not configured, the system will simulate email sending for development purposes.

## 🎛️ Application Modes

### 📧 Tablet Mode (Email Requests)
- Browse uploaded files
- Request files via email
- Simple interface optimized for tablets
- Email queue with status tracking

## 📮 Offline Email Queue System

The NeonBrush File Server is designed for offline/local network events where internet connectivity may not be available during the event. Email requests are saved to a persistent queue file that can be processed later when internet is available.

### How It Works

1. **During the Event** (No Internet Required):
   - Users request files via email using the Tablet Mode interface
   - Email requests are saved to `uploads/email_queue.json`
   - No actual emails are sent during the event

2. **After the Event** (Internet Required):
   - Run the Python email processor to send all queued emails
   - Files are automatically attached and sent to requested recipients
   - Queue is updated with processing status

### Processing Email Queue

#### Option 1: Using the Windows Batch Script (Easiest)
```bash
# Double-click or run from command prompt
send_emails.bat
```

This provides an interactive menu to:
- Preview emails (dry run)
- Send emails with SMTP configuration
- Create sample configuration files

#### Option 2: Using Python Directly
```bash
# Dry run (preview what would be sent)
python process_email_queue.py --dry-run

# Send emails (requires SMTP configuration)
python process_email_queue.py

# Use custom queue file
python process_email_queue.py ./custom/path/email_queue.json

# Use custom SMTP configuration
python process_email_queue.py --smtp-config my_smtp.json
```

### SMTP Configuration

Create `smtp_config.json` with your email settings:

```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "user": "your-email@gmail.com",
  "password": "your-app-password",
  "use_tls": true
}
```

**Gmail Users**: Use an [App Password](https://support.google.com/accounts/answer/185833) if 2FA is enabled.

### Email Queue File Format

The queue file (`uploads/email_queue.json`) contains:

```json
[
  {
    "id": "email_1704067200000_abc123def",
    "email": "user@example.com",
    "filename": "H1_presentation-67890.pdf",
    "filePath": "./uploads/H1_presentation-67890.pdf",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "status": "pending",
    "retryCount": 0,
    "fileSize": 2048576,
    "originalName": "presentation.pdf",
    "requestedBy": "192.168.1.100"
  }
]
```

### Processing Status

Email jobs have the following statuses:
- **`pending`**: Waiting to be processed
- **`sending`**: Currently being sent
- **`sent`**: Successfully delivered
- **`failed`**: Failed after 3 retry attempts

### Troubleshooting

1. **No emails in queue**: Check that users actually requested files via Tablet Mode
2. **SMTP errors**: Verify `smtp_config.json` credentials and network connectivity
3. **File not found**: Ensure uploaded files haven't been deleted before processing
4. **Python not found**: Install Python 3.6+ from [python.org](https://python.org)

### Example Workflow

1. **Event Setup**: Start the file server with `docker-compose up`
2. **During Event**: Users upload files (headsets) and request emails (tablets)
3. **Event End**: Stop the server, collect the system with queue file
4. **Post-Event**: Copy files to internet-connected computer
5. **Email Processing**: Run `send_emails.bat` or `python process_email_queue.py`
6. **Verification**: Check processing logs and email delivery status
