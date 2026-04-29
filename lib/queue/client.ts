import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Lazy singleton — only connects when first accessed.
// This avoids crashing the module import if Redis is not running locally.
let _connection: IORedis | null = null;
let _reportQueue: Queue | null = null;
let _videoQueue: Queue | null = null;
let _packagerQueue: Queue | null = null;

export function getConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    _connection.on('error', (err) => {
      // Suppress connection errors in dev when Redis is not running
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Redis] Connection error (non-fatal in dev):', err.message);
      }
    });
  }
  return _connection;
}

export function getReportQueue(): Queue {
  if (!_reportQueue) {
    _reportQueue = new Queue('report-generation', { connection: getConnection() as any });
  }
  return _reportQueue;
}

export function getVideoQueue(): Queue {
  if (!_videoQueue) {
    _videoQueue = new Queue('video-processing', { connection: getConnection() as any });
  }
  return _videoQueue;
}

export function getPackagerQueue(): Queue {
  if (!_packagerQueue) {
    _packagerQueue = new Queue('territorial-packaging', { connection: getConnection() as any });
  }
  return _packagerQueue;
}

// Backwards-compatible named exports for places that already import these directly
export const reportQueue = { add: (name: string, data: any, opts?: any) => getReportQueue().add(name, data, opts) } as any;
export const videoQueue = { add: (name: string, data: any, opts?: any) => getVideoQueue().add(name, data, opts) } as any;
export const packagerQueue = { add: (name: string, data: any, opts?: any) => getPackagerQueue().add(name, data, opts) } as any;
export const connection = { on: () => {} } as any; // stub — use getConnection() internally
