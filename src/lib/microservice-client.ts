interface MicroserviceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

interface ProformaInvoiceCommand {
  command: 'issue_proforma_invoice';
  data: {
    userId: string;
    packageId: string;
    packageName: string;
    hours: number;
    pricePerHour: number;
    totalPrice: number;
    currency: string;
    validityDays: number;
    userData: {
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      address?: string;
      city?: string;
      region?: string;
      country?: string;
      cnp: string;
      companyId?: string;
      companyName?: string;
      companyVatCode?: string;
      companyAddress?: string;
      companyCity?: string;
      companyCountry?: string;
    };
    paymentMethod: 'card' | 'bank_transfer' | 'cash';
    paymentLink: boolean;
    vatPercentage?: number;
    pricesIncludeVat?: boolean;
    convertToRON?: boolean;
    targetCurrency?: string;
  };
}

interface MicroserviceResponse {
  success: boolean;
  data?: {
    invoiceId: string;
    microserviceId: string;
    paymentLink?: string;
    status: 'pending' | 'issued' | 'failed';
    message?: string;
  };
  error?: string;
}

export class MicroserviceClient {
  private config: MicroserviceConfig;

  constructor(config: MicroserviceConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config,
    };
  }

  async sendCommand(command: ProformaInvoiceCommand): Promise<MicroserviceResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/api/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result as MicroserviceResponse;

    } catch (error) {
      console.error('Microservice communication error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout - microservice is not responding',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred while communicating with microservice',
      };
    }
  }

  async issueProformaInvoice(invoiceData: {
    userId: string;
    packageId: string;
    packageName: string;
    hours: number;
    pricePerHour: number;
    totalPrice: number;
    currency: string;
    validityDays: number;
    userData: {
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      address?: string;
      city?: string;
      region?: string;
      country?: string;
      cnp: string;
      companyId?: string;
      companyName?: string;
      companyVatCode?: string;
      companyAddress?: string;
      companyCity?: string;
      companyCountry?: string;
    };
    paymentMethod: 'card' | 'bank_transfer' | 'cash';
    paymentLink: boolean;
    vatPercentage?: number;
    pricesIncludeVat?: boolean;
    convertToRON?: boolean;
    targetCurrency?: string;
  }): Promise<MicroserviceResponse> {
    const command: ProformaInvoiceCommand = {
      command: 'issue_proforma_invoice',
      data: invoiceData,
    };

    return this.sendCommand(command);
  }

  async checkInvoiceStatus(invoiceId: string): Promise<MicroserviceResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/api/invoices/${invoiceId}/status`, {
        method: 'GET',
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result as MicroserviceResponse;

    } catch (error) {
      console.error('Error checking invoice status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create a singleton instance
const microserviceClient = new MicroserviceClient({
  baseUrl: process.env.MICROSERVICE_URL || 'http://localhost:3002',
  apiKey: process.env.MICROSERVICE_API_KEY || 'your-api-key-here',
  timeout: parseInt(process.env.MICROSERVICE_TIMEOUT || '30000'),
});

export default microserviceClient;
