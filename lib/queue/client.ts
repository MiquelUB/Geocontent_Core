
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Lazy singletons
let _connection: any | null = null;
let _reportQueue: any | null = null;
let _videoQueue: any | null = null;
let _packagerQueue: any | null = null;

export async function getConnection() {
  if (!_connection) {
    const IORedis = (await import('ioredis')).default;
    _connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    _connection.on('error', (err: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Redis] Connection error (non-fatal in dev):', err.message);
      }
    });
  }
  return _connection;
}

export async function getReportQueue() {
  if (!_reportQueue) {
    const { Queue } = await import('bullmq');
    const connection = await getConnection();
    _reportQueue = new Queue('report-generation', { connection });
  }
  return _reportQueue;
}

export async function getVideoQueue() {
  if (!_videoQueue) {
    const { Queue } = await import('bullmq');
    const connection = await getConnection();
    _videoQueue = new Queue('video-processing', { connection });
  }
  return _videoQueue;
}

export async function getPackagerQueue() {
  if (!_packagerQueue) {
    const { Queue } = await import('bullmq');
    const connection = await getConnection();
    _packagerQueue = new Queue('territorial-packaging', { connection });
  }
  return _packagerQueue;
}

// Stubs for backwards compatibility (will resolve lazily on use)
export const reportQueue = { 
  add: async (name: string, data: any, opts?: any) => {
    const q = await getReportQueue();
    return q.add(name, data, opts);
  }
};

export const videoQueue = { 
  add: async (name: string, data: any, opts?: any) => {
    const q = await getVideoQueue();
    return q.add(name, data, opts);
  }
};

export const packagerQueue = { 
  add: async (name: string, data: any, opts?: any) => {
    const q = await getPackagerQueue();
    return q.add(name, data, opts);
  }
};
