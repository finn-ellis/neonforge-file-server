import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface EmailJob {
  id: string;
  email: string;
  filename: string;
  filePath: string;
  timestamp: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  retryCount: number;
}

class EmailService {
  private transporter!: nodemailer.Transporter;
  private emailQueue: EmailJob[] = [];
  private isProcessing = false;

  constructor() {
    this.initializeTransporter();
    this.startQueueProcessor();
  }

  private initializeTransporter() {
    // Configure email transporter based on environment
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.warn('⚠️ Email transporter verification failed:', error.message);
        console.warn('📧 Email functionality will be simulated');
      } else {
        console.log('✅ Email server is ready to send messages');
      }
    });
  }

  async queueEmail(email: string, filename: string, filePath: string): Promise<string> {
    const jobId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const emailJob: EmailJob = {
      id: jobId,
      email,
      filename,
      filePath,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0
    };

    this.emailQueue.push(emailJob);
    console.log(`📧 Email queued: ${email} for file ${filename} (Job ID: ${jobId})`);
    
    return jobId;
  }

  private async startQueueProcessor() {
    setInterval(async () => {
      if (!this.isProcessing && this.emailQueue.length > 0) {
        await this.processQueue();
      }
    }, 5000); // Process queue every 5 seconds
  }

  private async processQueue() {
    this.isProcessing = true;

    const pendingJobs = this.emailQueue.filter(job => job.status === 'pending');
    
    for (const job of pendingJobs) {
      try {
        job.status = 'sending';
        await this.sendEmail(job);
        job.status = 'sent';
        console.log(`✅ Email sent successfully: ${job.email} (Job ID: ${job.id})`);
      } catch (error) {
        job.retryCount++;
        if (job.retryCount >= 3) {
          job.status = 'failed';
          console.error(`❌ Email failed after 3 retries: ${job.email} (Job ID: ${job.id})`);
        } else {
          job.status = 'pending';
          console.warn(`⚠️ Email retry ${job.retryCount}/3: ${job.email} (Job ID: ${job.id})`);
        }
      }
    }

    // Clean up old jobs (older than 24 hours)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.emailQueue = this.emailQueue.filter(job => job.timestamp > cutoffTime);

    this.isProcessing = false;
  }

  private async sendEmail(job: EmailJob): Promise<void> {
    if (!fs.existsSync(job.filePath)) {
      throw new Error('File not found');
    }

    const stats = fs.statSync(job.filePath);
    const fileSize = this.formatFileSize(stats.size);
    
    // Check if email credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      // Simulate email sending for development
      console.log(`📧 [SIMULATED] Email sent to: ${job.email}`);
      console.log(`📎 File: ${job.filename} (${fileSize})`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      return;
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: job.email,
      subject: `🎨 Your NeonBrush File: ${job.filename}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">🎨 NeonBrush File Server</h1>
            <p style="margin: 10px 0 0 0;">Your requested file is ready!</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">📁 File Details</h2>
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <p><strong>Filename:</strong> ${job.filename}</p>
              <p><strong>Size:</strong> ${fileSize}</p>
              <p><strong>Requested:</strong> ${job.timestamp.toLocaleString()}</p>
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
          </div>
        </div>
      `,
      attachments: [
        {
          filename: job.filename,
          path: job.filePath
        }
      ]
    };

    await this.transporter.sendMail(mailOptions);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getQueueStatus(): { total: number; pending: number; sending: number; sent: number; failed: number } {
    const total = this.emailQueue.length;
    const pending = this.emailQueue.filter(job => job.status === 'pending').length;
    const sending = this.emailQueue.filter(job => job.status === 'sending').length;
    const sent = this.emailQueue.filter(job => job.status === 'sent').length;
    const failed = this.emailQueue.filter(job => job.status === 'failed').length;

    return { total, pending, sending, sent, failed };
  }

  getJobStatus(jobId: string): EmailJob | null {
    return this.emailQueue.find(job => job.id === jobId) || null;
  }
}

export default EmailService;
