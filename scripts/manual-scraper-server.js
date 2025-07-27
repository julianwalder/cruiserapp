const express = require('express');
const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 4000;

const ICAO_SCRAPER_TOKEN = process.env.ICAO_SCRAPER_TOKEN;
const prisma = new PrismaClient();

app.use(express.json());

app.post('/run-icao-scraper', (req, res) => {
  if (!ICAO_SCRAPER_TOKEN) {
    console.error('ICAO_SCRAPER_TOKEN env variable not set. Refusing all requests.');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${ICAO_SCRAPER_TOKEN}`) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  exec('node scripts/scrape-icao-comprehensive-v8.js', (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ success: true, output: stdout });
  });
});

app.post('/seed-icao-database', async (req, res) => {
  if (!ICAO_SCRAPER_TOKEN) {
    console.error('ICAO_SCRAPER_TOKEN env variable not set. Refusing all requests.');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${ICAO_SCRAPER_TOKEN}`) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    console.log('🚀 Starting ICAO database seeding...');
    
    const dataPath = path.join(__dirname, 'icao-aircraft-extracted-v8.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ 
        error: 'icao-aircraft-extracted-v8.json not found. Please run the scraper first.' 
      });
    }

    const raw = fs.readFileSync(dataPath, 'utf-8');
    const icaoTypes = JSON.parse(raw);

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const entry of icaoTypes) {
      const where = {
        manufacturer_model_typeDesignator: {
          manufacturer: entry.manufacturer,
          model: entry.model,
          typeDesignator: entry.typeDesignator,
        },
      };

      const existing = await prisma.iCAOReferenceType.findUnique({ where });
      
      if (!existing) {
        await prisma.iCAOReferenceType.create({
          data: {
            manufacturer: entry.manufacturer,
            model: entry.model,
            typeDesignator: entry.typeDesignator,
            description: entry.description,
            engineType: entry.engineType,
            engineCount: parseInt(entry.engineCount, 10),
            wtc: entry.wtc,
          },
        });
        inserted++;
      } else {
        const needsUpdate = 
          existing.description !== entry.description ||
          existing.engineType !== entry.engineType ||
          existing.engineCount !== parseInt(entry.engineCount, 10) ||
          existing.wtc !== entry.wtc;

        if (needsUpdate) {
          await prisma.iCAOReferenceType.update({
            where: { id: existing.id },
            data: {
              description: entry.description,
              engineType: entry.engineType,
              engineCount: parseInt(entry.engineCount, 10),
              wtc: entry.wtc,
            },
          });
          updated++;
        } else {
          unchanged++;
        }
      }
    }

    const summary = {
      inserted,
      updated,
      unchanged,
      total: inserted + updated + unchanged,
      timestamp: new Date().toISOString(),
      success: true
    };

    // Save summary to file
    const summaryPath = path.join(__dirname, 'icao-seeding-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`✅ ICAO database seeding completed:`, summary);
    
    res.json({ 
      success: true, 
      summary,
      message: `ICAO database seeded successfully. Inserted: ${inserted}, Updated: ${updated}, Unchanged: ${unchanged}`
    });
  } catch (error) {
    console.error('❌ ICAO database seeding error:', error);
    // Write a failed summary
    const summary = {
      inserted: 0,
      updated: 0,
      unchanged: 0,
      total: 0,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message || 'Database seeding failed'
    };
    const summaryPath = path.join(__dirname, 'icao-seeding-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    res.status(500).json({ 
      error: error.message || 'Database seeding failed',
      details: error.stack
    });
  }
});

app.listen(PORT, () => {
  if (!ICAO_SCRAPER_TOKEN) {
    console.warn('WARNING: ICAO_SCRAPER_TOKEN env variable not set. All requests will be refused.');
  }
  console.log(`Manual ICAO scraper server running on port ${PORT}`);
}); 