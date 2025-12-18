import { Job } from 'bull';
import { logger } from '../utils/logger';

export interface WebhookJobData {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  retries?: number;
  metadata: {
    requestId: string;
    originalJobId?: string;
    timestamp: string;
  };
}

export async function processWebhookCallback(job: Job<WebhookJobData>): Promise<any> {
  const startTime = Date.now();
  const { url, method, headers, body, metadata } = job.data;
  
  logger.info('Processing webhook callback job', {
    jobId: job.id,
    url,
    method,
    requestId: metadata.requestId
  });

  try {
    // In a real implementation, we would use axios to make the HTTP request
    // For now, we'll simulate the webhook call
    const axios = require('axios');
    
    const response = await axios({
      method,
      url,
      headers: headers || {},
      data: body,
      timeout: 10000 // 10 seconds timeout
    });

    const duration = Date.now() - startTime;
    
    logger.info('Webhook callback completed successfully', {
      jobId: job.id,
      url,
      statusCode: response.status,
      duration,
      requestId: metadata.requestId
    });

    return {
      success: true,
      statusCode: response.status,
      data: response.data,
      duration,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Webhook callback failed', {
      jobId: job.id,
      url,
      error: error.message,
      duration,
      attempt: job.attemptsMade + 1
    });

    // Re-throw to trigger retry
    throw error;
  }
}