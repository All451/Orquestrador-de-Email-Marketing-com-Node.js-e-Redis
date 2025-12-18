import Bull, { Queue, JobOptions } from 'bull';
import { queueRedisConfig } from '../../config/redis.config';
import { logger } from '../../utils/logger';

export enum QueueType {
  TRIAL_EMAIL = 'trial-email',
  MARKETING_CAMPAIGN = 'marketing-campaign',
  BULK_PROCESSING = 'bulk-processing',
  WEBHOOK_CALLBACK = 'webhook-callback',
  NOTIFICATIONS = 'notifications'
}

export interface QueueJob<T = any> {
  id?: string;
  name: string;
  data: T;
  opts?: JobOptions;
  timestamp?: Date;
}

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<QueueType, Queue> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create all queues
      for (const queueType of Object.values(QueueType)) {
        const queue = new Bull(queueType, {
          redis: queueRedisConfig,
          defaultJobOptions: {
            attempts: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
            backoff: {
              type: 'exponential',
              delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '5000')
            },
            removeOnComplete: true,
            removeOnFail: false,
            timeout: 300000 // 5 minutes
          }
        });

        // Event listeners
        queue.on('active', (job) => {
          logger.info(`Job ${job.id} started in queue ${queueType}`, {
            jobId: job.id,
            queue: queueType,
            data: job.data
          });
        });

        queue.on('completed', (job) => {
          logger.info(`Job ${job.id} completed in queue ${queueType}`, {
            jobId: job.id,
            queue: queueType,
            duration: job.finishedOn ? job.finishedOn - job.processedOn : 0
          });
        });

        queue.on('failed', (job, err) => {
          logger.error(`Job ${job?.id} failed in queue ${queueType}`, {
            jobId: job?.id,
            queue: queueType,
            error: err.message,
            attemptsMade: job?.attemptsMade
          });
        });

        queue.on('stalled', (job) => {
          logger.warn(`Job ${job.id} stalled in queue ${queueType}`, {
            jobId: job.id,
            queue: queueType
          });
        });

        this.queues.set(queueType, queue);
      }

      this.isInitialized = true;
      logger.info('Queue manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue manager', { error });
      throw error;
    }
  }

  async addJob<T>(queueType: QueueType, jobData: QueueJob<T>): Promise<string> {
    const queue = this.queues.get(queueType);
    if (!queue) {
      throw new Error(`Queue ${queueType} not found`);
    }

    try {
      const job = await queue.add(jobData.name, jobData.data, {
        jobId: jobData.id || undefined,
        ...jobData.opts
      });

      logger.info(`Job added to queue ${queueType}`, {
        jobId: job.id,
        queue: queueType,
        jobName: jobData.name
      });

      return job.id.toString();
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueType}`, {
        queue: queueType,
        error: error.message
      });
      throw error;
    }
  }

  async addBulkJobs<T>(
    queueType: QueueType,
    jobs: Array<QueueJob<T>>
  ): Promise<string[]> {
    const queue = this.queues.get(queueType);
    if (!queue) {
      throw new Error(`Queue ${queueType} not found`);
    }

    try {
      const bullJobs = jobs.map(job => ({
        name: job.name,
        data: job.data,
        opts: {
          jobId: job.id,
          ...job.opts
        }
      }));

      const addedJobs = await queue.addBulk(bullJobs);
      const jobIds = addedJobs.map(job => job.id.toString());

      logger.info(`Bulk jobs added to queue ${queueType}`, {
        queue: queueType,
        count: jobs.length,
        jobIds
      });

      return jobIds;
    } catch (error) {
      logger.error(`Failed to add bulk jobs to queue ${queueType}`, {
        queue: queueType,
        error: error.message
      });
      throw error;
    }
  }

  async getJob(queueType: QueueType, jobId: string): Promise<any> {
    const queue = this.queues.get(queueType);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    return job;
  }

  async getQueueStatus(queueType: QueueType): Promise<any> {
    const queue = this.queues.get(queueType);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      queue: queueType,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }

  async getAllQueuesStatus(): Promise<Record<string, any>> {
    const statuses: Record<string, any> = {};

    for (const [queueType, queue] of this.queues.entries()) {
      statuses[queueType] = await this.getQueueStatus(queueType);
    }

    return statuses;
  }

  async pauseQueue(queueType: QueueType): Promise<void> {
    const queue = this.queues.get(queueType);
    if (queue) {
      await queue.pause();
      logger.info(`Queue ${queueType} paused`);
    }
  }

  async resumeQueue(queueType: QueueType): Promise<void> {
    const queue = this.queues.get(queueType);
    if (queue) {
      await queue.resume();
      logger.info(`Queue ${queueType} resumed`);
    }
  }

  async emptyQueue(queueType: QueueType): Promise<void> {
    const queue = this.queues.get(queueType);
    if (queue) {
      await queue.empty();
      logger.info(`Queue ${queueType} emptied`);
    }
  }

  async closeAll(): Promise<void> {
    for (const [queueType, queue] of this.queues.entries()) {
      await queue.close();
      logger.info(`Queue ${queueType} closed`);
    }
    this.isInitialized = false;
  }
}