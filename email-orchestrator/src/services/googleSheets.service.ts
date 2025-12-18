import { google, sheets_v4 } from 'googleapis';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export class GoogleSheetsService {
  private static auth: any;

  static async initialize() {
    try {
      const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH || './credentials/google-sheets.json';
      
      if (!fs.existsSync(credentialsPath)) {
        logger.warn('Google Sheets credentials not found', { path: credentialsPath });
        return;
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      // Use JWT authentication for service account
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      logger.info('Google Sheets service initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service', { error });
      throw error;
    }
  }

  static async appendLead(spreadsheetId: string, sheetName: string, leadData: any): Promise<any> {
    try {
      if (!this.auth) {
        await this.initialize();
      }

      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      const values = [Object.values(leadData)];
      
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1:Z1`,
        valueInputOption: 'RAW',
        requestBody: {
          values
        }
      });

      logger.info('Lead appended to Google Sheets', {
        spreadsheetId,
        sheetName,
        range: response.data.updates?.updatedRange
      });

      return {
        success: true,
        range: response.data.updates?.updatedRange,
        updatedRows: response.data.updates?.updatedRows
      };
    } catch (error) {
      logger.error('Failed to append lead to Google Sheets', {
        error: error.message,
        spreadsheetId,
        sheetName
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getLeads(spreadsheetId: string, sheetName: string, limit: number = 100): Promise<any[]> {
    try {
      if (!this.auth) {
        await this.initialize();
      }

      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z${limit + 1}` // Get header row + data rows
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        logger.info('No data found in sheet', { spreadsheetId, sheetName });
        return [];
      }

      // Convert to array of objects using first row as headers
      const headers = rows[0];
      const leads = rows.slice(1).map(row => {
        const lead: any = {};
        headers.forEach((header, index) => {
          lead[header] = row[index] || '';
        });
        return lead;
      });

      logger.info('Leads retrieved from Google Sheets', {
        spreadsheetId,
        sheetName,
        count: leads.length
      });

      return leads;
    } catch (error) {
      logger.error('Failed to get leads from Google Sheets', {
        error: error.message,
        spreadsheetId,
        sheetName
      });

      return [];
    }
  }

  static async updateLead(spreadsheetId: string, sheetName: string, row: number, leadData: any): Promise<any> {
    try {
      if (!this.auth) {
        await this.initialize();
      }

      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      const values = [Object.values(leadData)];
      
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${row}:Z${row}`,
        valueInputOption: 'RAW',
        requestBody: {
          values
        }
      });

      logger.info('Lead updated in Google Sheets', {
        spreadsheetId,
        sheetName,
        range: response.data.updatedRange
      });

      return {
        success: true,
        range: response.data.updatedRange,
        updatedCells: response.data.updatedCells
      };
    } catch (error) {
      logger.error('Failed to update lead in Google Sheets', {
        error: error.message,
        spreadsheetId,
        sheetName,
        row
      });

      return {
        success: false,
        error: error.message
      };
    }
  }
}