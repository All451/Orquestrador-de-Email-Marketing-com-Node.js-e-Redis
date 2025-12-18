import { Job } from 'bull';
import { N8nService } from '../services/n8n.service';
import { GoogleSheetsService } from '../services/googleSheets.service';
import { logger } from '../utils/logger';

export interface MarketingJobData {
  niche: 'clinica' | 'imobiliaria' | 'construtora';
  sheetId: string;
  sheetName: string;
  limit: number;
  filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  metadata: {
    campaignId: string;
    userId?: string;
    requestId: string;
  };
}

export async function processMarketingCampaign(job: Job<MarketingJobData>): Promise<any> {
  const startTime = Date.now();
  const { niche, sheetId, sheetName, limit, filters, metadata } = job.data;
  
  logger.info('Processing marketing campaign job', {
    jobId: job.id,
    niche,
    campaignId: metadata.campaignId,
    sheetId
  });

  try {
    // Step 1: Fetch leads from Google Sheets
    const leads = await GoogleSheetsService.getLeads(sheetId, sheetName, limit);
    
    if (!leads || leads.length === 0) {
      logger.warn('No leads found for campaign', { sheetId, niche });
      return {
        success: true,
        message: 'No leads to process',
        processed: 0,
        duration: Date.now() - startTime
      };
    }

    // Step 2: Filter unprocessed leads
    const unprocessedLeads = leads.filter(
      (lead: any) => !lead.Status || lead.Status !== '✅ Email Enviado'
    );

    if (unprocessedLeads.length === 0) {
      logger.info('All leads already processed', { sheetId, niche });
      return {
        success: true,
        message: 'All leads already processed',
        processed: 0,
        duration: Date.now() - startTime
      };
    }

    // Step 3: Process in batches
    const batchSize = 20;
    const results = [];
    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < unprocessedLeads.length; i += batchSize) {
      const batch = unprocessedLeads.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      logger.info(`Processing batch ${batchNumber}`, {
        batch: batchNumber,
        size: batch.length,
        total: unprocessedLeads.length
      });

      try {
        const batchResult = await N8nService.triggerMarketingWorkflow({
          niche,
          leads: batch,
          metadata: {
            ...metadata,
            batchNumber,
            totalBatches: Math.ceil(unprocessedLeads.length / batchSize)
          }
        });

        if (batchResult.success) {
          processedCount += batch.length;
          results.push({
            batch: batchNumber,
            success: true,
            processed: batch.length,
            executionId: batchResult.executionId
          });
        } else {
          failedCount += batch.length;
          results.push({
            batch: batchNumber,
            success: false,
            error: batchResult.error,
            processed: 0
          });
        }

        // Small delay between batches
        if (i + batchSize < unprocessedLeads.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (batchError) {
        logger.error(`Batch ${batchNumber} failed`, {
          batch: batchNumber,
          error: batchError.message
        });
        failedCount += batch.length;
        results.push({
          batch: batchNumber,
          success: false,
          error: batchError.message,
          processed: 0
        });
      }
    }

    const duration = Date.now() - startTime;
    
    logger.info('Marketing campaign job completed', {
      jobId: job.id,
      niche,
      totalLeads: leads.length,
      unprocessed: unprocessedLeads.length,
      processed: processedCount,
      failed: failedCount,
      duration,
      successRate: ((processedCount / unprocessedLeads.length) * 100).toFixed(2) + '%'
    });

    return {
      success: true,
      summary: {
        niche,
        totalLeads: leads.length,
        unprocessedLeads: unprocessedLeads.length,
        processed: processedCount,
        failed: failedCount,
        batches: results.length,
        successRate: (processedCount / unprocessedLeads.length) * 100
      },
      batchResults: results,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Marketing campaign job failed', {
      jobId: job.id,
      niche,
      error: error.message,
      duration,
      attempt: job.attemptsMade + 1
    });

    throw error;
  }
}