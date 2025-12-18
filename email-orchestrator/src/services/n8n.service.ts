import axios from 'axios';
import { logger } from '../utils/logger';

export class N8nService {
  private static baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
  private static apiKey = process.env.N8N_API_KEY;

  static async triggerTrialWorkflow(payload: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}${process.env.N8N_TRIAL_WEBHOOK || '/webhook/trial'}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'X-Api-Key': this.apiKey })
          },
          timeout: 30000 // 30 seconds
        }
      );

      logger.info('Trial workflow triggered successfully', {
        webhook: process.env.N8N_TRIAL_WEBHOOK,
        status: response.status
      });

      return {
        success: true,
        executionId: response.data?.executionId || null,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to trigger trial workflow', {
        error: error.message,
        webhook: process.env.N8N_TRIAL_WEBHOOK
      });

      return {
        success: false,
        error: error.message,
        executionId: null
      };
    }
  }

  static async triggerMarketingWorkflow(payload: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}${process.env.N8N_MARKETING_WEBHOOK || '/webhook/marketing'}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'X-Api-Key': this.apiKey })
          },
          timeout: 60000 // 60 seconds
        }
      );

      logger.info('Marketing workflow triggered successfully', {
        webhook: process.env.N8N_MARKETING_WEBHOOK,
        status: response.status
      });

      return {
        success: true,
        executionId: response.data?.executionId || null,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to trigger marketing workflow', {
        error: error.message,
        webhook: process.env.N8N_MARKETING_WEBHOOK
      });

      return {
        success: false,
        error: error.message,
        executionId: null
      };
    }
  }

  static async triggerBulkWorkflow(payload: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/webhook/bulk`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'X-Api-Key': this.apiKey })
          },
          timeout: 120000 // 120 seconds
        }
      );

      logger.info('Bulk workflow triggered successfully', {
        status: response.status
      });

      return {
        success: true,
        executionId: response.data?.executionId || null,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to trigger bulk workflow', {
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        executionId: null
      };
    }
  }
}