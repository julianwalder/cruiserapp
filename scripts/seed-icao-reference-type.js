// scripts/seed-icao-reference-type.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, 'icao-aircraft-extracted-v8.json');
  if (!fs.existsSync(dataPath)) {
    console.error('ICAO data file not found:', dataPath);
    process.exit(1);
  }
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const icaoTypes = JSON.parse(rawData);

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
          engineCount: parseInt(entry.engineCount) || 1,
          wtc: entry.wtc,
        },
      });
      inserted++;
    } else {
      // Check for differences
      const needsUpdate =
        existing.description !== entry.description ||
        existing.engineType !== entry.engineType ||
        existing.engineCount !== (parseInt(entry.engineCount) || 1) ||
        existing.wtc !== entry.wtc;
      if (needsUpdate) {
        await prisma.iCAOReferenceType.update({
          where,
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
  }

  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 