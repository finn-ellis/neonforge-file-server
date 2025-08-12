#!/usr/bin/env python3
"""
NeonBrush Email Queue Processor

This script processes the email queue file created by the NeonBrush File Server.
It's designed to run after an event when internet connectivity is available.

Usage:
    python process_email_queue.py [queue_file_path] [--dry-run] [--smtp-config smtp_config.json]

Examples:
    # Process queue with default settings
    python process_email_queue.py

    # Process specific queue file
    python process_email_queue.py ./data/email_queue.json

    # Dry run (don't actually send emails)
    python process_email_queue.py --dry-run

    # Use custom SMTP configuration
    python process_email_queue.py --smtp-config my_smtp.json
"""

import json
import os
import sys
import argparse
import smtplib
import mimetypes
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('email_processor.log', encoding='utf-8'),
        logging.StreamHandler()
    ],
    encoding='utf-8'
)
logger = logging.getLogger(__name__)
# logger.setLevel(logging.INFO)


class EmailQueueProcessor:
    def __init__(self, smtp_config=None, dry_run=False):
        self.smtp_config = smtp_config or self.load_default_smtp_config()
        self.dry_run = dry_run
        self.processed_count = 0
        self.failed_count = 0
        
        if self.dry_run:
            logger.info("[DRY RUN MODE] - No emails will actually be sent")

    def load_default_smtp_config(self):
        """Load SMTP configuration from environment variables or config file"""
        # First try to load from smtp_config.json
        config_file = Path('smtp_config.json')
        if config_file.exists():
            try:
                with open(config_file) as f:
                    config = json.load(f)
                    logger.info(f"[SMTP] Loaded SMTP config from {config_file}")
                    return config
            except Exception as e:
                logger.warning(f"[WARNING] Failed to load {config_file}: {e}")

        # Fallback to environment variables
        config = {
            'host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
            'port': int(os.getenv('SMTP_PORT', '587')),
            'user': os.getenv('SMTP_USER'),
            'password': os.getenv('SMTP_PASS'),
            'use_tls': os.getenv('SMTP_TLS', 'true').lower() == 'true'
        }
        
        if not config['user'] or not config['password']:
            logger.warning("[WARNING] No SMTP credentials found. Please set SMTP_USER and SMTP_PASS environment variables or create smtp_config.json")
            
        return config

    def load_queue(self, queue_file_path):
        """Load email queue from JSON file"""
        try:
            with open(queue_file_path, 'r') as f:
                queue_data = json.load(f)
                
            # Convert timestamp strings back to datetime objects
            for job in queue_data:
                job['timestamp'] = datetime.fromisoformat(job['timestamp'].replace('Z', '+00:00'))
                
            logger.info(f"📥 Loaded {len(queue_data)} jobs from {queue_file_path}")
            return queue_data
        except FileNotFoundError:
            logger.error(f"❌ Queue file not found: {queue_file_path}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in queue file: {e}")
            return []

    def save_queue(self, queue_data, queue_file_path):
        """Save updated queue back to JSON file"""
        try:
            # Convert datetime objects back to ISO strings for JSON serialization
            queue_for_json = []
            for job in queue_data:
                job_copy = job.copy()
                job_copy['timestamp'] = job['timestamp'].isoformat()
                queue_for_json.append(job_copy)
                
            with open(queue_file_path, 'w') as f:
                json.dump(queue_for_json, f, indent=2)
                
            logger.info(f"💾 Saved updated queue to {queue_file_path}")
        except Exception as e:
            logger.error(f"❌ Failed to save queue: {e}")

    def format_file_size(self, bytes_size):
        """Format file size in human readable format"""
        if not bytes_size:
            return "Unknown size"
            
        for unit in ['Bytes', 'KB', 'MB', 'GB']:
            if bytes_size < 1024.0:
                return f"{bytes_size:.2f} {unit}"
            bytes_size /= 1024.0
        return f"{bytes_size:.2f} TB"

    def create_email_content(self, job):
        """Create the HTML email content"""
        file_size = self.format_file_size(job.get('fileSize', 0))
        timestamp = job['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">🎨 NeonBrush File Server</h1>
            <p style="margin: 10px 0 0 0;">Your requested file is ready!</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">📁 File Details</h2>
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <p><strong>Filename:</strong> {job['filename']}</p>
              <p><strong>Size:</strong> {file_size}</p>
              <p><strong>Requested:</strong> {timestamp}</p>
              {f'<p><strong>Requested by:</strong> {job["requestedBy"]}</p>' if job.get('requestedBy') else ''}
            </div>
            
            <p style="margin-top: 20px;">Your file is attached to this email. If you have any issues accessing the file, please contact support.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <div style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 8px; display: inline-block;">
                <strong>✨ Thanks for using NeonBrush File Server!</strong>
              </div>
            </div>
          </div>
          
          <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>This email was sent automatically from NeonBrush File Server.</p>
            <p>Processed on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
          </div>
        </div>
        """
        return html_content

    def send_email(self, job):
        """Send a single email job"""
        if self.dry_run:
            logger.info(f"📧 [DRY RUN] Would send email to: {job['email']} for file: {job['filename']}")
            return True

        try:
            # Check if file exists
            if not os.path.exists(job['filePath']):
                raise Exception(f"File not found: {job['filePath']}")

            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.smtp_config['user']
            msg['To'] = job['email']
            msg['Subject'] = f"🎨 Your NeonBrush File: {job['filename']}"

            # Add HTML body
            html_content = self.create_email_content(job)
            msg.attach(MIMEText(html_content, 'html'))

            # Add file attachment
            with open(job['filePath'], 'rb') as attachment:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment.read())

            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {job["filename"]}'
            )
            msg.attach(part)

            # Send email
            with smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port']) as server:
                if self.smtp_config.get('use_tls', True):
                    server.starttls()
                server.login(self.smtp_config['user'], self.smtp_config['password'])
                server.send_message(msg)

            logger.info(f"✅ Email sent successfully to: {job['email']} for file: {job['filename']}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send email to {job['email']}: {e}")
            return False

    def process_queue(self, queue_file_path):
        """Process all pending emails in the queue"""
        logger.info(f"🚀 Starting email queue processing...")
        
        queue_data = self.load_queue(queue_file_path)
        if not queue_data:
            logger.info("📭 No emails to process")
            return

        pending_jobs = [job for job in queue_data if job['status'] == 'pending']
        logger.info(f"📧 Found {len(pending_jobs)} pending email jobs")

        if not pending_jobs:
            logger.info("📭 No pending emails to process")
            return

        # Validate SMTP configuration
        if not self.dry_run and (not self.smtp_config['user'] or not self.smtp_config['password']):
            logger.error("❌ SMTP credentials not configured. Cannot send emails.")
            return

        for job in pending_jobs:
            logger.info(f"📤 Processing job {job['id']}: {job['email']} <- {job['filename']}")
            
            # Update status to sending
            job['status'] = 'sending'
            
            # Attempt to send email
            success = self.send_email(job)
            
            if success:
                job['status'] = 'sent'
                self.processed_count += 1
            else:
                job['retryCount'] = job.get('retryCount', 0) + 1
                if job['retryCount'] >= 3:
                    job['status'] = 'failed'
                    logger.error(f"❌ Job {job['id']} failed after 3 retries")
                    self.failed_count += 1
                else:
                    job['status'] = 'pending'
                    logger.warning(f"⚠️ Job {job['id']} will be retried (attempt {job['retryCount']}/3)")

            # Small delay between emails to be nice to SMTP servers
            if not self.dry_run:
                time.sleep(1)

        # Save updated queue
        self.save_queue(queue_data, queue_file_path)
        
        logger.info(f"🎉 Processing complete! Sent: {self.processed_count}, Failed: {self.failed_count}")

def create_sample_smtp_config():
    """Create a sample SMTP configuration file"""
    sample_config = {
        "host": "smtp.gmail.com",
        "port": 587,
        "user": "your-email@gmail.com",
        "password": "your-app-password",
        "use_tls": True
    }
    
    with open('smtp_config.sample.json', 'w') as f:
        json.dump(sample_config, f, indent=2)
    
    print("📝 Created smtp_config.sample.json")
    print("📧 Copy it to smtp_config.json and update with your SMTP credentials")

def main():
    parser = argparse.ArgumentParser(
        description='Process NeonBrush email queue',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        'queue_file',
        nargs='?',
        default='./data/email_queue.json',
        help='Path to the email queue JSON file (default: ./data/email_queue.json)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulate processing without actually sending emails'
    )
    
    parser.add_argument(
        '--smtp-config',
        help='Path to SMTP configuration JSON file'
    )
    
    parser.add_argument(
        '--create-sample-config',
        action='store_true',
        help='Create a sample SMTP configuration file'
    )

    args = parser.parse_args()

    if args.create_sample_config:
        create_sample_smtp_config()
        return

    # Load SMTP config if specified
    smtp_config = None
    if args.smtp_config:
        try:
            with open(args.smtp_config) as f:
                smtp_config = json.load(f)
                logger.info(f"📧 Loaded SMTP config from {args.smtp_config}")
        except Exception as e:
            logger.error(f"❌ Failed to load SMTP config from {args.smtp_config}: {e}")
            sys.exit(1)

    # Create processor and run
    processor = EmailQueueProcessor(smtp_config=smtp_config, dry_run=args.dry_run)
    processor.process_queue(args.queue_file)

if __name__ == '__main__':
    main()
