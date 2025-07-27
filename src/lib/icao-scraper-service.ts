import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export class IcaoScraperService {
  static async scrapeAndImport(): Promise<{ inserted: number; updated: number; unchanged: number }> {
    // Path to the output of the real ICAO scraper
    const dataPath = path.join(process.cwd(), 'scripts', 'icao-aircraft-extracted-v8.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error('icao-aircraft-extracted-v8.json not found. Please run the scraper script first: node scripts/scrape-icao-comprehensive-v8.js');
    }
    let aircraftData: any[];
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      aircraftData = JSON.parse(raw);
    } catch (e) {
      throw new Error('Failed to read or parse icao-aircraft-extracted-v8.json. Please check the file.');
    }

    let inserted = 0, updated = 0, unchanged = 0;
    for (const entry of aircraftData) {
      try {
        const existing = await prisma.iCAOReferenceType.findUnique({
          where: {
            manufacturer_model_typeDesignator: {
              manufacturer: entry.manufacturer,
              model: entry.model,
              typeDesignator: entry.typeDesignator,
            },
          },
        });
        if (!existing) {
          await prisma.iCAOReferenceType.create({
            data: {
              manufacturer: entry.manufacturer,
              model: entry.model,
              typeDesignator: entry.typeDesignator,
              description: entry.description,
              engineType: entry.engineType,
              engineCount: parseInt(entry.engineCount) || 1,
              wtc: entry.wtc,
            },
          });
          inserted++;
        } else {
          const needsUpdate =
            existing.description !== entry.description ||
            existing.engineType !== entry.engineType ||
            existing.engineCount !== (parseInt(entry.engineCount) || 1) ||
            existing.wtc !== entry.wtc;
          if (needsUpdate) {
            await prisma.iCAOReferenceType.update({
              where: { id: existing.id },
              data: {
                description: entry.description,
                engineType: entry.engineType,
                engineCount: parseInt(entry.engineCount) || 1,
                wtc: entry.wtc,
              },
            });
            updated++;
          } else {
            unchanged++;
          }
        }
      } catch (error) {
        // Optionally log error for this entry
        // console.error('Error upserting ICAO entry:', entry, error);
      }
    }
    return { inserted, updated, unchanged };
  }
} 