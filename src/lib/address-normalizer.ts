/**
 * Romanian Address Normalizer
 * 
 * This service normalizes Romanian addresses from various sources (ID cards, invoices, etc.)
 * into a standardized format with proper field separation.
 */

export interface NormalizedAddress {
  // Administrative divisions
  judet?: string;           // Județ (County)
  capitala?: string;        // Capitală (Capital city)
  oras?: string;           // Oraș (City)
  sector?: string;         // Sector (District - only for Bucharest)
  comuna?: string;         // Comună (Commune)
  sat?: string;            // Sat (Village)
  
  // Street information
  streetType?: string;     // Type: Bulevard, Stradă, etc.
  streetName?: string;     // Street name
  streetNumber?: string;   // Number
  block?: string;          // Bloc (Block)
  entrance?: string;       // Scară (Entrance/Staircase)
  floor?: string;          // Etaj (Floor)
  apartment?: string;      // Apartament (Apartment)
  
  // Full formatted address
  fullAddress: string;     // Complete formatted address
  streetAddress: string;   // Street-level address only
  
  // Source information
  source: string;          // Where this address came from
  confidence: number;      // Confidence score (0-1)
}

export interface AddressParseResult {
  success: boolean;
  address?: NormalizedAddress;
  error?: string;
  rawInput: string;
}

export class RomanianAddressNormalizer {
  // Romanian administrative divisions
  private static JUDETE = [
    'ALBA', 'ARAD', 'ARGEȘ', 'BACĂU', 'BIHOR', 'BISTRIȚA-NĂSĂUD', 'BOTOȘANI', 'BRĂILA',
    'BRAȘOV', 'BUCUREȘTI', 'BUZĂU', 'CĂLĂRAȘI', 'CARAȘ-SEVERIN', 'CLUJ', 'CONSTANȚA',
    'COVASNA', 'DÂMBOVIȚA', 'DOLJ', 'GALAȚI', 'GIURGIU', 'GORJ', 'HARGHITA', 'HUNEDOARA',
    'IALOMIȚA', 'IAȘI', 'ILFOV', 'MARAMUREȘ', 'MEHEDINȚI', 'MUREȘ', 'NEAMȚ', 'OLT',
    'PRAHOVA', 'SĂLAJ', 'SATU MARE', 'SIBIU', 'SUCEAVA', 'TELEORMAN', 'TIMIȘ', 'TULCEA',
    'VÂLCEA', 'VASLUI', 'VRANCEA'
  ];

  // Common street type abbreviations
  private static STREET_TYPES = {
    'BD.': 'Bulevardul',
    'BLVD.': 'Bulevardul',
    'BLVD': 'Bulevardul',
    'STR.': 'Strada',
    'STR': 'Strada',
    'ST.': 'Strada',
    'ST': 'Strada',
    'CALE': 'Calea',
    'PȚA.': 'Piața',
    'PȚA': 'Piața',
    'PIAȚA': 'Piața',
    'SOS.': 'Șoseaua',
    'SOS': 'Șoseaua',
    'ȘOS.': 'Șoseaua',
    'ȘOS': 'Șoseaua',
    'AL.': 'Aleea',
    'AL': 'Aleea',
    'ALEEA': 'Aleea',
    'PARC': 'Parcul',
    'PARC.': 'Parcul'
  };

  // Bucharest sectors
  private static BUCHAREST_SECTORS = [
    'SEC.1', 'SEC.2', 'SEC.3', 'SEC.4', 'SEC.5', 'SEC.6',
    'SECTOR 1', 'SECTOR 2', 'SECTOR 3', 'SECTOR 4', 'SECTOR 5', 'SECTOR 6',
    'SECTORUL 1', 'SECTORUL 2', 'SECTORUL 3', 'SECTORUL 4', 'SECTORUL 5', 'SECTORUL 6'
  ];

  // Common building abbreviations
  private static BUILDING_ABBREVIATIONS = {
    'BL.': 'Bloc',
    'BL': 'Bloc',
    'SC.': 'Scara',
    'SC': 'Scara',
    'SCARĂ': 'Scara',
    'ET.': 'Etaj',
    'ET': 'Etaj',
    'ETAJ': 'Etaj',
    'AP.': 'Apartament',
    'AP': 'Apartament',
    'APARTAMENT': 'Apartament',
    'NR.': 'Numărul',
    'NR': 'Numărul',
    'NUMĂRUL': 'Numărul'
  };

  /**
   * Normalize a Romanian address from various sources
   */
  static normalizeAddress(rawAddress: string, source: string = 'unknown'): AddressParseResult {
    try {
      if (!rawAddress || typeof rawAddress !== 'string') {
        return {
          success: false,
          error: 'Invalid address input',
          rawInput: rawAddress || ''
        };
      }

      const normalized = rawAddress.trim().toUpperCase();
      const result: NormalizedAddress = {
        fullAddress: rawAddress,
        streetAddress: '',
        source,
        confidence: 0
      };

      // Parse administrative divisions
      this.parseAdministrativeDivisions(normalized, result);
      
      // Parse street information
      this.parseStreetInformation(normalized, result);
      
      // Build formatted addresses
      this.buildFormattedAddresses(result);
      
      // Calculate confidence score
      result.confidence = this.calculateConfidence(result);

      return {
        success: true,
        address: result,
        rawInput: rawAddress
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        rawInput: rawAddress
      };
    }
  }

  /**
   * Parse administrative divisions (județ, capitală, sector, etc.)
   */
  private static parseAdministrativeDivisions(address: string, result: NormalizedAddress): void {
    // Check for Bucharest
    if (address.includes('BUCUREȘTI') || address.includes('BUCUREŞTI')) {
      result.capitala = 'București';
      
      // Check for sectors
      for (const sector of this.BUCHAREST_SECTORS) {
        if (address.includes(sector)) {
          result.sector = sector.replace('SEC.', 'Sector ').replace('SECTOR ', 'Sector ');
          break;
        }
      }
      return;
    }

    // Check for other județe
    for (const judet of this.JUDETE) {
      if (address.includes(judet) && judet !== 'BUCUREȘTI') {
        result.judet = judet;
        break;
      }
    }

    // Try to extract city name (this is more complex and would need a comprehensive city database)
    // For now, we'll focus on the street parsing
  }

  /**
   * Parse street information (street type, name, number, building details)
   */
  private static parseStreetInformation(address: string, result: NormalizedAddress): void {
    // Extract street type
    for (const [abbrev, full] of Object.entries(this.STREET_TYPES)) {
      if (address.includes(abbrev)) {
        result.streetType = full;
        break;
      }
    }

    // Extract street name and number FIRST (before removing building details)
    this.extractStreetNameAndNumber(address, result);

    // Extract building details
    this.extractBuildingDetails(address, result);
  }

  /**
   * Extract building details (block, entrance, floor, apartment)
   */
  private static extractBuildingDetails(address: string, result: NormalizedAddress): void {
    // Block
    const blockMatch = address.match(/BL\.?\s*(\d+)/i);
    if (blockMatch) {
      result.block = blockMatch[1];
    }

    // Entrance/Staircase
    const entranceMatch = address.match(/SC\.?\s*([A-Z])/i);
    if (entranceMatch) {
      result.entrance = entranceMatch[1];
    }

    // Floor
    const floorMatch = address.match(/ET\.?\s*(\d+)/i);
    if (floorMatch) {
      result.floor = floorMatch[1];
    }

    // Apartment
    const apartmentMatch = address.match(/AP\.?\s*(\d+)/i);
    if (apartmentMatch) {
      result.apartment = apartmentMatch[1];
    }

    // Street number
    const numberMatch = address.match(/NR\.?\s*(\d+)/i);
    if (numberMatch) {
      result.streetNumber = numberMatch[1];
    }
  }

  /**
   * Extract street name and number from the address
   */
  private static extractStreetNameAndNumber(address: string, result: NormalizedAddress): void {
    // Extract street name directly from the original address format
    // Pattern: BD.STREET_NAME NR.NUMBER
    if (result.streetType) {
      // Find the street type abbreviation that was used
      let streetTypeAbbrev = '';
      for (const [abbrev, full] of Object.entries(this.STREET_TYPES)) {
        if (full === result.streetType) {
          streetTypeAbbrev = abbrev;
          break;
        }
      }
      
      if (streetTypeAbbrev) {
        // Try a simpler approach - find the abbreviation and extract what comes after it
        const abbrevIndex = address.toUpperCase().indexOf(streetTypeAbbrev.toUpperCase());
        if (abbrevIndex !== -1) {
          // Get everything after the abbreviation
          const afterAbbrev = address.substring(abbrevIndex + streetTypeAbbrev.length).trim();
          
                     // Find the next abbreviation (NR.) to get the street name
           const nrIndex = afterAbbrev.toUpperCase().indexOf('NR.');
           if (nrIndex !== -1) {
             const streetName = afterAbbrev.substring(0, nrIndex).trim();
             result.streetName = this.normalizeStreetName(streetName);
            
            // Extract the number after NR.
            const afterNr = afterAbbrev.substring(nrIndex + 3).trim();
            const numberMatch = afterNr.match(/^(\d+)/);
            if (numberMatch) {
              result.streetNumber = numberMatch[1];
            }
          }
        }
      }
    }
  }

  /**
   * Normalize street name to proper case (Title Case)
   */
  private static normalizeStreetName(streetName: string): string {
    // Convert to lowercase first, then apply title case
    const lowerCase = streetName.toLowerCase();
    
    // Split by spaces and capitalize each word
    const words = lowerCase.split(' ');
    const normalizedWords = words.map(word => {
      // Handle Romanian characters properly
      if (word.length === 0) return word;
      
      // Capitalize first letter
      const firstChar = word.charAt(0).toUpperCase();
      const rest = word.slice(1);
      
      return firstChar + rest;
    });
    
    return normalizedWords.join(' ');
  }

  /**
   * Build formatted address strings
   */
  private static buildFormattedAddresses(result: NormalizedAddress): void {
    const parts: string[] = [];

    // Administrative parts
    if (result.capitala) {
      parts.push(result.capitala);
      if (result.sector) {
        parts.push(result.sector);
      }
    } else if (result.judet) {
      parts.push(result.judet);
      if (result.oras) {
        parts.push(result.oras);
      }
    }

    // Street parts
    const streetParts: string[] = [];
    
    if (result.streetType) {
      streetParts.push(result.streetType);
    }
    
    if (result.streetName) {
      streetParts.push(result.streetName);
    }
    
    if (result.streetNumber) {
      streetParts.push(`nr. ${result.streetNumber}`);
    }
    
    if (result.block) {
      streetParts.push(`bl. ${result.block}`);
    }
    
    if (result.entrance) {
      streetParts.push(`sc. ${result.entrance}`);
    }
    
    if (result.floor) {
      streetParts.push(`et. ${result.floor}`);
    }
    
    if (result.apartment) {
      streetParts.push(`ap. ${result.apartment}`);
    }

    result.streetAddress = streetParts.join(' ');
    result.fullAddress = [...parts, result.streetAddress].filter(Boolean).join(', ');
  }

  /**
   * Calculate confidence score based on parsed data
   */
  private static calculateConfidence(result: NormalizedAddress): number {
    let score = 0;
    let total = 0;

    // Administrative division (30% weight)
    total += 30;
    if (result.capitala || result.judet) score += 30;

    // Street type (15% weight)
    total += 15;
    if (result.streetType) score += 15;

    // Street name (25% weight)
    total += 25;
    if (result.streetName) score += 25;

    // Building details (30% weight)
    total += 30;
    if (result.streetNumber) score += 10;
    if (result.block) score += 5;
    if (result.entrance) score += 5;
    if (result.floor) score += 5;
    if (result.apartment) score += 5;

    return total > 0 ? score / total : 0;
  }

  /**
   * Compare two addresses and return similarity score
   */
  static compareAddresses(addr1: NormalizedAddress, addr2: NormalizedAddress): number {
    let score = 0;
    let total = 0;

    // Compare administrative divisions
    total += 30;
    if (addr1.capitala === addr2.capitala || addr1.judet === addr2.judet) {
      score += 15;
    }
    if (addr1.sector === addr2.sector) {
      score += 15;
    }

    // Compare street information
    total += 70;
    if (addr1.streetType === addr2.streetType) score += 10;
    if (addr1.streetName === addr2.streetName) score += 20;
    if (addr1.streetNumber === addr2.streetNumber) score += 10;
    if (addr1.block === addr2.block) score += 10;
    if (addr1.entrance === addr2.entrance) score += 5;
    if (addr1.floor === addr2.floor) score += 5;
    if (addr1.apartment === addr2.apartment) score += 10;

    return total > 0 ? score / total : 0;
  }

  /**
   * Merge multiple address sources into a single normalized address
   */
  static mergeAddressSources(addresses: Array<{ address: NormalizedAddress; source: string; confidence: number }>): NormalizedAddress {
    if (addresses.length === 0) {
      throw new Error('No addresses to merge');
    }

    if (addresses.length === 1) {
      return addresses[0].address;
    }

    // Sort by confidence
    const sorted = addresses.sort((a, b) => b.confidence - a.confidence);
    
    // Use the highest confidence address as base
    const result = { ...sorted[0].address };
    
    // Merge missing fields from other sources
    for (let i = 1; i < sorted.length; i++) {
      const source = sorted[i].address;
      
      // Fill in missing fields
      if (!result.judet && source.judet) result.judet = source.judet;
      if (!result.capitala && source.capitala) result.capitala = source.capitala;
      if (!result.sector && source.sector) result.sector = source.sector;
      if (!result.streetType && source.streetType) result.streetType = source.streetType;
      if (!result.streetName && source.streetName) result.streetName = source.streetName;
      if (!result.streetNumber && source.streetNumber) result.streetNumber = source.streetNumber;
      if (!result.block && source.block) result.block = source.block;
      if (!result.entrance && source.entrance) result.entrance = source.entrance;
      if (!result.floor && source.floor) result.floor = source.floor;
      if (!result.apartment && source.apartment) result.apartment = source.apartment;
    }

    // Rebuild formatted addresses
    this.buildFormattedAddresses(result);
    
    // Update source and confidence
    result.source = 'merged';
    result.confidence = Math.max(...addresses.map(a => a.confidence));

    return result;
  }
}
