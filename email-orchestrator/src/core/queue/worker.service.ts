import { QueueManager, QueueType } from './queue.manager';
import { processTrialEmail } from '../../jobs/trial.job';
import { processMarketingCampaign } from '../../jobs/marketing.job';
import { processBulkEmails } from '../../jobs/bulk.job';
import { processWebhookCallback } from '../../jobs/webhook.job';
import { logger } from '../../utils/logger';

export class WorkerService {
  private queueManager: QueueManager;
  private isRunning = false;

  constructor() {
    this.queueManager = QueueManager.getInstance();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker service is already running');
      return;
    }

    try {
      await this.queueManager.initialize();
      
      // Start processing for each queue
      const queue = (this.queueManager as any).queues;
      
      // Trial Email Queue
      queue.get(QueueType.TRIAL_EMAIL)?.process(
        parseInt(process.env.QUEUE_CONCURRENCY || '5'),
        processTrialEmail
      );

      // Marketing Campaign Queue
      queue.get(QueueType.MARKETING_CAMPAIGN)?.process(
        parseInt(process.env.QUEUE_CONCURRENCY || '3'),
        processMarketingCampaign
      );

      // Bulk Processing Queue
      queue.get(QueueType.BULK_PROCESSING)?.process(
        parseInt(process.env.QUEUE_CONCURRENCY || '2'),
        processBulkEmails
      );

      // Webhook Callback Queue
      queue.get(QueueType.WEBHOOK_CALLBACK)?.process(
        10, // High concurrency for callbacks
        processWebhookCallback
      );

      this.isRunning = true;
      
      logger.info('Worker service started successfully', {
        concurrency: process.env.QUEUE_CONCURRENCY,
        queues: Object.values(QueueType)
      });

      // Handle graceful shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());

    } catch (error) {
      logger.error('Failed to start worker service', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('Stopping worker service...');
    
    try {
      await this.queueManager.closeAll();
      this.isRunning = false;
      
      logger.info('Worker service stopped gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error stopping worker service', { error });
      process.exit(1);
    }
  }

  async getStatus(): Promise<any> {
    if (!this.isRunning) {
      return { status: 'stopped' };
    }

    try {
      const queuesStatus = await this.queueManager.getAllQueuesStatus();
      
      return {
        status: 'running',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        queues: queuesStatus
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  const worker = new WorkerService();
  worker.start().catch(error => {
    logger.error('Failed to start worker', error);
    process.exit(1);
  });
}