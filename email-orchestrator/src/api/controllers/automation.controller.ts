import { Request, Response } from 'express';
import { QueueManager, QueueType } from '../../core/queue/queue.manager';
import { logger } from '../../utils/logger';

export class AutomationController {
  private queueManager: QueueManager;

  constructor() {
    this.queueManager = QueueManager.getInstance();
  }

  async sendTrialEmail(req: Request, res: Response) {
    try {
      const { nome, email, telefone, cnpj, empresa, source } = req.body;

      // Validation
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      const jobData = {
        lead: {
          nome: nome || '',
          email,
          telefone: telefone || '',
          cnpj: cnpj || '',
          empresa: empresa || nome || '',
          source: source || 'api'
        },
        metadata: {
          requestId: this.generateRequestId(),
          userId: (req as any).user?.id,
          timestamp: new Date().toISOString()
        }
      };

      // Add to queue
      const jobId = await this.queueManager.addJob(QueueType.TRIAL_EMAIL, {
        name: 'send-trial-email',
        data: jobData,
        opts: {
          priority: 1, // High priority for trial emails
          attempts: 3,
          delay: 0
        }
      });

      logger.info('Trial email job queued', { jobId, email });

      res.json({
        success: true,
        message: 'Trial email job queued successfully',
        jobId,
        data: {
          email,
          requestId: jobData.metadata.requestId
        },
        monitor: {
          jobUrl: `/api/queue/jobs/${jobId}`,
          queueStatus: `/api/queue/status/trial-email`
        }
      });

    } catch (error) {
      logger.error('Error queueing trial email', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to queue trial email'
      });
    }
  }

  async triggerCampaign(req: Request, res: Response) {
    try {
      const { niche, sheetId, sheetName, limit, campaignName } = req.body;

      const validNiches = ['clinica', 'imobiliaria', 'construtora'];
      if (!validNiches.includes(niche)) {
        return res.status(400).json({
          success: false,
          error: `Invalid niche. Must be one of: ${validNiches.join(', ')}`
        });
      }

      const jobData = {
        niche,
        sheetId,
        sheetName: sheetName || 'Leads',
        limit: limit || 100,
        filters: req.body.filters || {},
        metadata: {
          campaignId: campaignName || `campaign-${Date.now()}`,
          userId: (req as any).user?.id,
          requestId: this.generateRequestId()
        }
      };

      const jobId = await this.queueManager.addJob(QueueType.MARKETING_CAMPAIGN, {
        name: 'marketing-campaign',
        data: jobData,
        opts: {
          priority: 2,
          attempts: 3,
          timeout: 300000 // 5 minutes
        }
      });

      logger.info('Marketing campaign job queued', { jobId, niche, sheetId });

      res.json({
        success: true,
        message: 'Marketing campaign job queued successfully',
        jobId,
        data: {
          niche,
          sheetId,
          campaignId: jobData.metadata.campaignId
        },
        monitor: {
          jobUrl: `/api/queue/jobs/${jobId}`,
          dashboard: `/dashboard`
        }
      });

    } catch (error) {
      logger.error('Error queueing marketing campaign', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to queue marketing campaign'
      });
    }
  }

  async bulkSend(req: Request, res: Response) {
    try {
      const { niche, leads, templateId } = req.body;

      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Leads must be a non-empty array'
        });
      }

      // Validate each lead
      const invalidLeads = leads.filter(lead => !lead.email);
      if (invalidLeads.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Some leads are missing email',
          invalidCount: invalidLeads.length
        });
      }

      // Create jobs in batches
      const batchSize = 50;
      const jobs = [];
      
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        
        jobs.push({
          name: `bulk-send-batch-${Math.floor(i / batchSize) + 1}`,
          data: {
            niche,
            leads: batch,
            templateId,
            metadata: {
              batchNumber: Math.floor(i / batchSize) + 1,
              totalBatches: Math.ceil(leads.length / batchSize),
              requestId: this.generateRequestId(),
              userId: (req as any).user?.id
            }
          },
          opts: {
            priority: 3,
            attempts: 2
          }
        });
      }

      const jobIds = await this.queueManager.addBulkJobs(QueueType.BULK_PROCESSING, jobs);

      logger.info('Bulk send jobs queued', {
        totalLeads: leads.length,
        batches: jobs.length,
        jobIds
      });

      res.json({
        success: true,
        message: `Bulk send queued with ${jobs.length} batches`,
        totalLeads: leads.length,
        batches: jobs.length,
        jobIds,
        monitor: {
          dashboard: `/dashboard`,
          queueStatus: `/api/queue/status/bulk-processing`
        }
      });

    } catch (error) {
      logger.error('Error queueing bulk send', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to queue bulk send'
      });
    }
  }

  async getJobStatus(req: Request, res: Response) {
    try {
      const { jobId, queueType } = req.params;
      
      const queue = this.getQueueFromType(queueType);
      if (!queue) {
        return res.status(400).json({
          success: false,
          error: `Invalid queue type: ${queueType}`
        });
      }

      const job = await this.queueManager.getJob(queue, jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const state = await job.getState();
      const progress = job.progress();
      
      res.json({
        success: true,
        job: {
          id: job.id,
          name: job.name,
          state,
          progress,
          data: job.data,
          opts: job.opts,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason
        }
      });

    } catch (error) {
      logger.error('Error getting job status', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get job status'
      });
    }
  }

  async getQueueStatus(req: Request, res: Response) {
    try {
      const { queueType } = req.params;
      
      const queue = this.getQueueFromType(queueType);
      if (!queue) {
        return res.status(400).json({
          success: false,
          error: `Invalid queue type: ${queueType}`
        });
      }

      const status = await this.queueManager.getQueueStatus(queue);
      
      res.json({
        success: true,
        queue: queueType,
        status
      });

    } catch (error) {
      logger.error('Error getting queue status', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get queue status'
      });
    }
  }

  async getAllQueuesStatus(req: Request, res: Response) {
    try {
      const status = await this.queueManager.getAllQueuesStatus();
      
      res.json({
        success: true,
        status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting all queues status', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get queues status'
      });
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getQueueFromType(queueType: string): QueueType | null {
    const queueTypes = Object.values(QueueType);
    return queueTypes.includes(queueType as QueueType) ? queueType as QueueType : null;
  }
}