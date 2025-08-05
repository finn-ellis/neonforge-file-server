# Email Queue System - Quick Start Guide

## Overview
The NeonBrush File Server now uses a **persistent email queue system** designed for offline events. Email requests are saved during the event and processed later when internet is available.

## How It Works

### During the Event (Offline)
1. **File Server Running**: `docker-compose up`
2. **Users Upload Files**: Headsets use Upload Mode to upload files
3. **Users Request Emails**: Tablets use Tablet Mode to request files via email
4. **Emails Are Queued**: All email requests are saved to `uploads/email_queue.json`
5. **No Internet Required**: The system works completely offline

### After the Event (Online)
1. **Connect to Internet**: Move the system to internet-connected environment
2. **Process Email Queue**: Use the Python script or batch file to send emails
3. **Files Are Emailed**: All requested files are sent as email attachments

## Quick Commands

### Windows (Easiest)
```cmd
# Double-click or run from command prompt
send_emails.bat
```

### Python (Cross-platform)
```bash
# Preview what would be sent (no emails sent)
python process_email_queue.py --dry-run

# Send emails (requires SMTP configuration)
python process_email_queue.py

# Create sample SMTP configuration
python process_email_queue.py --create-sample-config
```

## SMTP Setup

1. **Create configuration file**:
   ```bash
   python process_email_queue.py --create-sample-config
   cp smtp_config.sample.json smtp_config.json
   ```

2. **Edit `smtp_config.json`** with your email settings:
   ```json
   {
     "host": "smtp.gmail.com",
     "port": 587,
     "user": "your-email@gmail.com",
     "password": "your-app-password",
     "use_tls": true
   }
   ```

3. **Gmail Users**: Use an [App Password](https://support.google.com/accounts/answer/185833) if 2FA is enabled

## File Locations

- **Email Queue**: `email_queue.json`
- **SMTP Config**: `smtp_config.json`
- **Processing Log**: `email_processor.log`
- **Uploaded Files**: `uploads/`

## Typical Workflow

1. **Event Setup**: Start file server with Docker
2. **During Event**: Users upload files and request emails (all offline)
3. **Event End**: Stop server, collect the hardware
4. **Post-Event**: 
   - Copy files to internet-connected computer
   - Configure SMTP settings
   - Run email processor
   - Verify all emails were sent

## Status Meanings

- **`pending`**: Waiting to be processed
- **`sending`**: Currently being sent  
- **`sent`**: Successfully delivered
- **`failed`**: Failed after 3 retry attempts

## Troubleshooting

- **No emails to process**: Check if users actually requested emails via Tablet Mode
- **SMTP errors**: Verify credentials and internet connectivity
- **File not found**: Files may have been deleted before processing
- **Python not found**: Install Python 3.6+ from python.org

## Example Queue File
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
    "requestedBy": "192.168.1.100"
  }
]
```

The system is now fully ready for offline event use! 🚀
