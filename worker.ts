import { config } from 'dotenv';
config({ path: '.env.local' });
config();


import { Worker } from 'bullmq';
import IORedis from 'ioredis';
// import { PrismaClient } from '@prisma/client'; // Import dynamically
// import { generateExecutiveSummary } from './lib/services/openrouter'; // Import dynamically
import { generateBarChartUrl, generatePieChartUrl } from './lib/services/charts';
import { generatePdf } from './lib/services/pdf';
import * as fs from 'fs';
import * as path from 'path';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const { processReport } = require('./lib/services/reportProcessor');
const { generateTerritorialPackage } = require('./lib/actions/packager');

const reportWorker = new Worker('report-generation', async job => {
  const { reportId, municipalityId } = job.data;
  await processReport(reportId, municipalityId);
}, { connection: connection as any });

const packagerWorker = new Worker('territorial-packaging', async job => {
  const { municipalityId } = job.data;
  
  try {
    const { prisma } = require('./lib/database/prisma');
    console.log(`[PackagerWorker] Status -> PROCESSING for ${municipalityId}`);
    
    await prisma.municipality.update({
      where: { id: municipalityId },
      data: { packagingStatus: 'PROCESSING' }
    });

    console.log(`[PackagerWorker] Iniciant empaquetat per a ${municipalityId}...`);
    await generateTerritorialPackage(municipalityId);
    
    await prisma.municipality.update({
      where: { id: municipalityId },
      data: { packagingStatus: 'IDLE' }
    });
    
    console.log(`[PackagerWorker] Empaquetat finalitzat amb èxit per a ${municipalityId}`);
  } catch (err) {
    console.error(`[PackagerWorker] ERROR en empaquetat per a ${municipalityId}:`, err);
    try {
      const { prisma } = require('./lib/database/prisma');
      await prisma.municipality.update({
        where: { id: municipalityId },
        data: { packagingStatus: 'ERROR' }
      });
    } catch (dbErr) {
      console.error("[PackagerWorker] No s'ha pogut marcar estat d'ERROR a la DB:", dbErr);
    }
    throw err; // Perquè BullMQ sàpiga que ha fallat i reintenti
  }
}, { 
  connection: connection as any,
  settings: {
    backoffStrategies: {
      exponential: (attempts: number) => Math.pow(2, attempts) * 1000,
    }
  }
});

console.log("Workers started (report-generation, territorial-packaging)...");
