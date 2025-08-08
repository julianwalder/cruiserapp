let OpenAI: any;
try {
  OpenAI = require('openai').default || require('openai');
} catch (e) {
  console.warn('OpenAI not available in production - address normalization disabled');
  OpenAI = null;
}

export interface NormalizedAddressData {
  street_address: string;
  city: string;
  state_region: string;
  country: string;
  postal_code?: string;
  confidence_score: number;
  processing_notes?: string;
}

export interface AddressNormalizationRequest {
  rawAddress: string;
  sourceType: 'invoice_import' | 'veriff_validation' | 'manual_update';
  userEmail?: string;
  context?: string;
}

export interface AddressComparisonRequest {
  existingAddress: NormalizedAddressData;
  newAddress: string;
  sourceType: 'veriff_validation' | 'manual_update';
  userEmail?: string;
}

export class OpenAIAddressService {
  private static openai: any;

  private static getClient(): any {
    if (!OpenAI) {
      throw new Error('OpenAI not available in production - address normalization is disabled');
    }
    
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  /**
   * Normalize a Romanian address using OpenAI
   */
  static async normalizeAddress(request: AddressNormalizationRequest): Promise<NormalizedAddressData> {
    const client = this.getClient();
    
    const systemPrompt = `You are an expert in Romanian address normalization. Your task is to parse and normalize Romanian addresses into structured fields.

IMPORTANT RULES:
1. For Bucharest (București): Use "București" as state_region and "Sector X" as city
2. For other cities: Use the județ (county) as state_region and the city name as city
3. Always use proper Romanian diacritics (ă, â, î, ș, ț)
4. Normalize street types: "BD." → "Bulevardul", "STR." → "Strada", etc.
5. Extract building details (bloc, scară, etaj, apartament) into street_address
6. Assign confidence_score based on data quality (0.0-1.0)

Return ONLY a valid JSON object with these exact fields:
{
  "street_address": "Complete street address with building details",
  "city": "City name (Sector X for Bucharest)",
  "state_region": "Județ or București",
  "country": "Romania",
  "postal_code": "Postal code if available",
  "confidence_score": 0.95,
  "processing_notes": "Brief notes about the normalization"
}`;

    const userPrompt = `Please normalize this Romanian address:

Raw Address: ${request.rawAddress}
Source: ${request.sourceType}
${request.userEmail ? `User Email: ${request.userEmail}` : ''}
${request.context ? `Context: ${request.context}` : ''}

Return the normalized address as JSON.`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const normalizedData = JSON.parse(content) as NormalizedAddressData;
      
      // Validate required fields
      if (!normalizedData.street_address || !normalizedData.city || !normalizedData.state_region || !normalizedData.country) {
        throw new Error('Missing required fields in normalized address');
      }

      // Ensure confidence score is within bounds
      normalizedData.confidence_score = Math.max(0, Math.min(1, normalizedData.confidence_score || 0.5));

      console.log(`✅ Address normalized successfully:`, {
        source: request.sourceType,
        confidence: normalizedData.confidence_score,
        city: normalizedData.city,
        state: normalizedData.state_region
      });

      return normalizedData;

    } catch (error) {
      console.error('❌ Error normalizing address with OpenAI:', error);
      
      // Return a fallback with low confidence
      return {
        street_address: request.rawAddress,
        city: 'Unknown',
        state_region: 'Unknown',
        country: 'Romania',
        confidence_score: 0.1,
        processing_notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Compare existing normalized address with new address data
   */
  static async compareAndUpdateAddress(request: AddressComparisonRequest): Promise<{
    shouldUpdate: boolean;
    updatedAddress?: NormalizedAddressData;
    comparisonNotes: string;
  }> {
    const client = this.getClient();

    const systemPrompt = `You are an expert in comparing Romanian addresses. Your task is to determine if a new address should replace an existing normalized address.

RULES:
1. If the new address is more complete/detailed, prefer it
2. If the new address has higher quality data (from ID validation), prefer it
3. If addresses are essentially the same, keep the existing one
4. Consider confidence scores and data sources
5. For Bucharest: "București" + "Sector X" is better than just "București"

Return ONLY a valid JSON object:
{
  "should_update": true/false,
  "updated_address": { normalized address object if should_update is true },
  "comparison_notes": "Explanation of the decision",
  "confidence_score": 0.95
}`;

    const userPrompt = `Compare these addresses:

EXISTING ADDRESS:
${JSON.stringify(request.existingAddress, null, 2)}

NEW ADDRESS:
Raw: ${request.newAddress}
Source: ${request.sourceType}
${request.userEmail ? `User: ${request.userEmail}` : ''}

Should the new address replace the existing one? Return JSON with decision.`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const result = JSON.parse(content);
      
      console.log(`✅ Address comparison completed:`, {
        shouldUpdate: result.should_update,
        confidence: result.confidence_score,
        notes: result.comparison_notes
      });

      return {
        shouldUpdate: result.should_update || false,
        updatedAddress: result.updated_address || undefined,
        comparisonNotes: result.comparison_notes || 'No comparison notes'
      };

    } catch (error) {
      console.error('❌ Error comparing addresses with OpenAI:', error);
      
      return {
        shouldUpdate: false,
        comparisonNotes: `Error during comparison: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Batch normalize addresses from invoice imports
   */
  static async batchNormalizeInvoiceAddresses(addresses: Array<{
    userId: string;
    email: string;
    rawAddress: string;
    invoiceId?: string;
  }>): Promise<Array<{
    userId: string;
    normalizedAddress: NormalizedAddressData;
    success: boolean;
    error?: string;
  }>> {
    const results = [];

    for (const addressData of addresses) {
      try {
        console.log(`🔄 Normalizing address for user ${addressData.userId}`);
        
        const normalizedAddress = await this.normalizeAddress({
          rawAddress: addressData.rawAddress,
          sourceType: 'invoice_import',
          userEmail: addressData.email,
          context: `Invoice ID: ${addressData.invoiceId}`
        });

        results.push({
          userId: addressData.userId,
          normalizedAddress,
          success: true
        });

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Failed to normalize address for user ${addressData.userId}:`, error);
        results.push({
          userId: addressData.userId,
          normalizedAddress: {
            street_address: addressData.rawAddress,
            city: 'Unknown',
            state_region: 'Unknown',
            country: 'Romania',
            confidence_score: 0.1,
            processing_notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}
