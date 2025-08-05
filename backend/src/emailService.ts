import fs from 'fs';
import path from 'path';

export interface EmailOptions {
  stayInTouch: boolean;
  includeScreenshots: boolean;
  include3DModels: boolean;
}

export interface EmailJob {
  id: string;
  email: string;
  filename: string;
  filePath: string;
  timestamp: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  retryCount: number;
  fileSize?: number;
  originalName?: string;
  requestedBy?: string; // IP address of requester
  options?: EmailOptions; // User preferences for email content
}

class EmailService {
  private queueFilePath: string;

  constructor() {
    // Create queue file path in the data directory
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.queueFilePath = path.join(dataDir, 'email_queue.json');

    // Initialize queue file if it doesn't exist
    if (!fs.existsSync(this.queueFilePath)) {
      this.saveQueue([]);
    }

    console.log(`📧 Email queue will be saved to: ${this.queueFilePath}`);
  }

  private loadQueue(): EmailJob[] {
    try {
      const data = fs.readFileSync(this.queueFilePath, 'utf8');
      const queue = JSON.parse(data);
      // Convert timestamp strings back to Date objects
      return queue.map((job: any) => ({
        ...job,
        timestamp: new Date(job.timestamp)
      }));
    } catch (error) {
      console.warn('⚠️ Could not load email queue, starting with empty queue');
      return [];
    }
  }

  private saveQueue(queue: EmailJob[]): void {
    try {
      fs.writeFileSync(this.queueFilePath, JSON.stringify(queue, null, 2));
    } catch (error) {
      console.error('❌ Failed to save email queue:', error);
    }
  }

  async queueEmail(
    email: string, 
    filename: string, 
    filePath: string, 
    requestedBy?: string,
    options?: EmailOptions
  ): Promise<string> {
    const jobId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get file stats for additional metadata
    let fileSize = 0;
    let originalName = filename;
    
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }
    } catch (error) {
      console.warn('⚠️ Could not get file stats for:', filePath);
    }
    
    const emailJob: EmailJob = {
      id: jobId,
      email,
      filename,
      filePath,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0,
      fileSize,
      originalName,
      requestedBy,
      options
    };

    // Load current queue, add new job, and save
    const currentQueue = this.loadQueue();
    currentQueue.push(emailJob);
    this.saveQueue(currentQueue);
    
    console.log(`📧 Email queued: ${email} for file ${filename} (Job ID: ${jobId})`);
    if (options) {
      const selectedOptions = [];
      if (options.stayInTouch) selectedOptions.push('Stay in touch');
      if (options.includeScreenshots) selectedOptions.push('Include screenshots');
      if (options.include3DModels) selectedOptions.push('Include 3D models');
      if (selectedOptions.length > 0) {
        console.log(`   📋 Options: ${selectedOptions.join(', ')}`);
      }
    }
    console.log(`💾 Queue saved to: ${this.queueFilePath}`);
    
    return jobId;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getQueueStatus(): { total: number; pending: number; sending: number; sent: number; failed: number } {
    const queue = this.loadQueue();
    const total = queue.length;
    const pending = queue.filter(job => job.status === 'pending').length;
    const sending = queue.filter(job => job.status === 'sending').length;
    const sent = queue.filter(job => job.status === 'sent').length;
    const failed = queue.filter(job => job.status === 'failed').length;

    return { total, pending, sending, sent, failed };
  }

  getJobStatus(jobId: string): EmailJob | null {
    const queue = this.loadQueue();
    return queue.find(job => job.id === jobId) || null;
  }

  // Method to get all pending jobs (useful for external processors)
  getPendingJobs(): EmailJob[] {
    const queue = this.loadQueue();
    return queue.filter(job => job.status === 'pending');
  }

  // Method to update job status (useful for external processors)
  updateJobStatus(jobId: string, status: EmailJob['status'], retryCount?: number): boolean {
    const queue = this.loadQueue();
    const jobIndex = queue.findIndex(job => job.id === jobId);
    
    if (jobIndex === -1) {
      return false;
    }

    queue[jobIndex].status = status;
    if (retryCount !== undefined) {
      queue[jobIndex].retryCount = retryCount;
    }

    this.saveQueue(queue);
    return true;
  }

  // Method to clean up old jobs
  cleanupOldJobs(olderThanHours: number = 24): number {
    const queue = this.loadQueue();
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = queue.length;
    
    const filteredQueue = queue.filter(job => job.timestamp > cutoffTime);
    this.saveQueue(filteredQueue);
    
    const removedCount = initialLength - filteredQueue.length;
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old email jobs`);
    }
    
    return removedCount;
  }

  // Get the queue file path (useful for external processors)
  getQueueFilePath(): string {
    return this.queueFilePath;
  }
}

export default EmailService;
