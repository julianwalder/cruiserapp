interface SmartBillConfig {
  username: string;
  password: string;
  cif?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

interface SmartBillInvoice {
  id: string;
  number: string;
  series: string;
  date: string;
  dueDate: string;
  status: string;
  total: number;
  currency: string;
  client: {
    name: string;
    vatCode?: string;
    address?: string;
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    unit?: string;
    description?: string;
    vatRate?: number;
  }>;
}

interface SmartBillResponse<T> {
  status: string;
  message?: string;
  data?: T;
  errorText?: string;
  successfully?: boolean;
  operationExecuted?: boolean;
}

interface SmartBillError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

interface SmartBillConnectionStatus {
  connected: boolean;
  accountStatus: 'active' | 'suspended' | 'inactive' | 'unknown';
  errorMessage?: string;
  lastChecked: string;
  apiVersion?: string;
}

class SmartBillService {
  private config: SmartBillConfig;
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: SmartBillConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://ws.smartbill.ro/SBORO/api';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.retries = config.retries || 3;
  }

  /**
   * Make a request with retry logic and comprehensive error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    attempt: number = 1
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'CruiserApp/1.0',
    };

    // Add basic auth if credentials are provided
    if (this.config.username && this.config.password) {
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let responseData: any;

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          responseData = JSON.parse(textResponse);
        } catch {
          responseData = { rawResponse: textResponse.substring(0, 500) };
        }
      }

      // Check for SmartBill-specific error responses
      if (responseData && responseData.errorText) {
        const error = this.parseSmartBillError(responseData, response.status);
        throw error;
      }

      if (!response.ok) {
        const error = this.parseHttpError(response.status, response.statusText, responseData);
        throw error;
      }

      return responseData;
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout') as SmartBillError;
      }

      // Retry logic for retryable errors
      if (attempt < this.retries && this.isRetryableError(error)) {
        console.log(`SmartBill API request failed, retrying... (attempt ${attempt + 1}/${this.retries})`);
        await this.delay(1000 * attempt); // Exponential backoff
        return this.makeRequest<T>(endpoint, method, body, attempt + 1);
      }

      console.error(`SmartBill API request failed after ${attempt} attempts:`, error);
      throw error;
    }
  }

  /**
   * Parse SmartBill-specific error responses
   */
  private parseSmartBillError(responseData: any, statusCode: number): SmartBillError {
    const errorText = responseData.errorText || 'Unknown SmartBill error';
    const message = responseData.message || errorText;
    
    // Check for specific error patterns
    if (errorText.includes('nu mai este disponibila in Cloud')) {
      return {
        code: 'ACCOUNT_SUSPENDED',
        message: 'SmartBill account is suspended or inactive',
        details: responseData,
        retryable: false
      };
    }

    if (errorText.includes('credentiale')) {
      return {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid SmartBill credentials',
        details: responseData,
        retryable: false
      };
    }

    if (errorText.includes('API')) {
      return {
        code: 'API_ACCESS_DENIED',
        message: 'API access is not enabled for this account',
        details: responseData,
        retryable: false
      };
    }

    return {
      code: 'SMARTBILL_ERROR',
      message: message,
      details: responseData,
      retryable: statusCode >= 500 || statusCode === 429
    };
  }

  /**
   * Parse HTTP errors
   */
  private parseHttpError(status: number, statusText: string, responseData?: any): SmartBillError {
    const retryable = status >= 500 || status === 429;
    
    switch (status) {
      case 401:
        return {
          code: 'UNAUTHORIZED',
          message: 'Authentication failed - check your credentials',
          details: responseData,
          retryable: false
        };
      case 403:
        return {
          code: 'FORBIDDEN',
          message: 'Access denied - check your API permissions',
          details: responseData,
          retryable: false
        };
      case 404:
        return {
          code: 'NOT_FOUND',
          message: 'API endpoint not found',
          details: responseData,
          retryable: false
        };
      case 429:
        return {
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded - try again later',
          details: responseData,
          retryable: true
        };
      case 500:
        return {
          code: 'SERVER_ERROR',
          message: 'SmartBill server error',
          details: responseData,
          retryable: true
        };
      default:
        return {
          code: 'HTTP_ERROR',
          message: `${status} ${statusText}`,
          details: responseData,
          retryable: retryable
        };
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error && typeof error === 'object' && 'retryable' in error) {
      return error.retryable;
    }
    
    // Default retryable errors
    const retryableMessages = [
      'timeout',
      'network',
      'server error',
      'rate limit',
      'temporary'
    ];
    
    const errorMessage = error?.message?.toLowerCase() || '';
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get comprehensive connection status
   */
  async getConnectionStatus(): Promise<SmartBillConnectionStatus> {
    try {
      const body: any = {};
      if (this.config.cif) {
        body.cif = this.config.cif;
      }
      body.limit = 1;

      await this.makeRequest('/invoice', 'POST', body);
      
      return {
        connected: true,
        accountStatus: 'active',
        lastChecked: new Date().toISOString(),
        apiVersion: '2.0'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      let accountStatus: 'active' | 'suspended' | 'inactive' | 'unknown' = 'unknown';
      
      if (errorMessage.includes('suspended') || errorMessage.includes('nu mai este disponibila')) {
        accountStatus = 'suspended';
      } else if (errorMessage.includes('credentials') || errorMessage.includes('unauthorized')) {
        accountStatus = 'inactive';
      }

      return {
        connected: false,
        accountStatus,
        errorMessage,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Get all invoices for a specific date range with enhanced error handling
   */
  async getInvoices(
    startDate?: string,
    endDate?: string,
    status?: string,
    limit?: number
  ): Promise<SmartBillInvoice[]> {
    const body: any = {};
    
    if (this.config.cif) {
      body.cif = this.config.cif;
    }
    if (startDate) body.startDate = startDate;
    if (endDate) body.endDate = endDate;
    if (status) body.status = status;
    if (limit) body.limit = limit;

    try {
      const response = await this.makeRequest<SmartBillInvoice[]>('/invoice', 'POST', body);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      throw error;
    }
  }

  /**
   * Get a specific invoice by ID
   */
  async getInvoice(id: string): Promise<SmartBillInvoice> {
    const body: any = { id };
    if (this.config.cif) {
      body.cif = this.config.cif;
    }

    const response = await this.makeRequest<SmartBillInvoice>('/invoice', 'POST', body);
    return response;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(invoiceData: SmartBillInvoice): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    try {
      const body: any = {
        ...invoiceData,
        cif: this.config.cif,
      };

      const response = await this.makeRequest<{ id: string; message?: string }>('/invoice', 'POST', body);
      
      return {
        success: true,
        invoiceId: response.id,
      };
    } catch (error) {
      console.error('Failed to create invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invoice',
      };
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(startDate?: string, endDate?: string): Promise<any> {
    const body: any = {};
    
    if (this.config.cif) {
      body.cif = this.config.cif;
    }
    if (startDate) body.startDate = startDate;
    if (endDate) body.endDate = endDate;

    const response = await this.makeRequest<any>('/invoice/stats', 'POST', body);
    return response;
  }

  /**
   * Get company information
   */
  async getCompanyInfo(): Promise<any> {
    const body: any = {};
    if (this.config.cif) {
      body.cif = this.config.cif;
    }

    const response = await this.makeRequest<any>('/company', 'POST', body);
    return response;
  }

  /**
   * Get clients list
   */
  async getClients(): Promise<any[]> {
    const body: any = {};
    if (this.config.cif) {
      body.cif = this.config.cif;
    }

    const response = await this.makeRequest<any[]>('/client', 'POST', body);
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get products list
   */
  async getProducts(): Promise<any[]> {
    const body: any = {};
    if (this.config.cif) {
      body.cif = this.config.cif;
    }

    const response = await this.makeRequest<any[]>('/product', 'POST', body);
    return Array.isArray(response) ? response : [];
  }

  /**
   * Test the API connection with detailed diagnostics
   */
  async testConnection(): Promise<{
    success: boolean;
    status: SmartBillConnectionStatus;
    diagnostics?: any;
  }> {
    try {
      const status = await this.getConnectionStatus();
      
      if (status.connected) {
        return {
          success: true,
          status
        };
      }

      // Try to get company info for additional diagnostics
      let diagnostics;
      try {
        diagnostics = await this.getCompanyInfo();
      } catch (error) {
        diagnostics = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

      return {
        success: false,
        status,
        diagnostics
      };
    } catch (error) {
      console.error('SmartBill connection test failed:', error);
      return {
        success: false,
        status: {
          connected: false,
          accountStatus: 'unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date().toISOString()
        }
      };
    }
  }
}

export { 
  SmartBillService, 
  type SmartBillInvoice, 
  type SmartBillConfig,
  type SmartBillError,
  type SmartBillConnectionStatus,
  type SmartBillResponse
}; 