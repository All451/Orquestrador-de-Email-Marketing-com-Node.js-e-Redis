import { Job } from 'bull';
import { N8nService } from '../services/n8n.service';
import { logger } from '../utils/logger';

export interface BulkJobData {
  niche: 'clinica' | 'imobiliaria' | 'construtora';
  leads: Array<{
    nome: string;
    email: string;
    telefone?: string;
    empresa?: string;
  }>;
  templateId?: string;
  metadata: {
    batchNumber: number;
    totalBatches: number;
    requestId: string;
    userId?: string;
  };
}

export async function processBulkEmails(job: Job<BulkJobData>): Promise<any> {
  const startTime = Date.now();
  const { niche, leads, templateId, metadata } = job.data;
  
  logger.info('Processing bulk emails job', {
    jobId: job.id,
    niche,
    batchNumber: metadata.batchNumber,
    totalBatches: metadata.totalBatches,
    leadCount: leads.length
  });

  try {
    // Validate leads
    const validLeads = leads.filter(lead => lead.email && lead.email.includes('@'));
    const invalidLeads = leads.length - validLeads.length;
    
    if (validLeads.length === 0) {
      throw new Error('No valid emails in the batch');
    }

    if (invalidLeads > 0) {
      logger.warn('Invalid emails found in batch', {
        invalidCount: invalidLeads,
        total: leads.length
      });
    }

    // Prepare data for n8n
    const n8nPayload = {
      tipo: 'bulk',
      niche,
      leads: validLeads,
      templateId,
      metadata: {
        jobId: job.id,
        batchNumber: metadata.batchNumber,
        totalBatches: metadata.totalBatches,
        requestId: metadata.requestId,
        timestamp: new Date().toISOString()
      }
    };

    // Call n8n webhook
    logger.info('Calling n8n bulk email workflow', {
      emailCount: validLeads.length,
      batchNumber: metadata.batchNumber
    });
    
    const n8nResult = await N8nService.triggerBulkWorkflow(n8nPayload);
    
    if (!n8nResult.success) {
      throw new Error(`n8n workflow failed: ${n8nResult.error}`);
    }

    const duration = Date.now() - startTime;
    
    logger.info('Bulk emails job completed successfully', {
      jobId: job.id,
      batchNumber: metadata.batchNumber,
      processed: validLeads.length,
      duration,
      executionId: n8nResult.executionId
    });

    return {
      success: true,
      processed: validLeads.length,
      failed: invalidLeads,
      executionId: n8nResult.executionId,
      duration,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Bulk emails job failed', {
      jobId: job.id,
      batchNumber: metadata.batchNumber,
      error: error.message,
      duration,
      attempt: job.attemptsMade + 1
    });

    throw error;
  }
}