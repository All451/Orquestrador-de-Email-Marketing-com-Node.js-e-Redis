import { Job } from 'bull';
import { N8nService } from '../services/n8n.service';
import { GoogleSheetsService } from '../services/googleSheets.service';
import { logger } from '../utils/logger';

export interface TrialJobData {
  lead: {
    nome: string;
    email: string;
    telefone?: string;
    cnpj?: string;
    empresa?: string;
    source?: string;
  };
  metadata: {
    requestId: string;
    userId?: string;
    timestamp: string;
  };
}

export async function processTrialEmail(job: Job<TrialJobData>): Promise<any> {
  const startTime = Date.now();
  const { lead, metadata } = job.data;
  
  logger.info('Processing trial email job', {
    jobId: job.id,
    email: lead.email,
    requestId: metadata.requestId
  });

  try {
    // Step 1: Validate lead data
    if (!lead.email || !lead.email.includes('@')) {
      throw new Error(`Invalid email: ${lead.email}`);
    }

    // Step 2: Prepare data for n8n
    const n8nPayload = {
      tipo: 'trial',
      lead: {
        Nome: lead.nome || 'Cliente',
        Email: lead.email,
        Telefone: lead.telefone || '',
        CNPJ: lead.cnpj || '',
        Empresa: lead.empresa || lead.nome || 'N/A',
        Source: lead.source || 'api',
        JobId: job.id,
        RequestId: metadata.requestId
      },
      metadata: {
        jobId: job.id,
        timestamp: new Date().toISOString(),
        queue: 'trial-email'
      }
    };

    // Step 3: Call n8n webhook
    logger.info('Calling n8n trial webhook', { email: lead.email });
    
    const n8nResult = await N8nService.triggerTrialWorkflow(n8nPayload);
    
    if (!n8nResult.success) {
      throw new Error(`n8n workflow failed: ${n8nResult.error}`);
    }

    // Step 4: Store in Google Sheets (optional)
    try {
      await GoogleSheetsService.appendLead(
        process.env.TRIAL_SHEET_ID!,
        'Trial_Leads',
        {
          ...n8nPayload.lead,
          Status: 'pending',
          JobId: job.id,
          DataCadastro: new Date().toISOString()
        }
      );
    } catch (sheetError) {
      logger.warn('Failed to store lead in Google Sheets', {
        error: sheetError.message,
        email: lead.email
      });
      // Don't fail the job if Google Sheets fails
    }

    const duration = Date.now() - startTime;
    
    logger.info('Trial email job completed successfully', {
      jobId: job.id,
      email: lead.email,
      duration,
      executionId: n8nResult.executionId
    });

    return {
      success: true,
      lead: lead.email,
      executionId: n8nResult.executionId,
      duration,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Trial email job failed', {
      jobId: job.id,
      email: lead.email,
      error: error.message,
      duration,
      attempt: job.attemptsMade + 1
    });

    // Re-throw to trigger retry
    throw error;
  }
}