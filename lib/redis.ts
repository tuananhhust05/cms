import { createClient } from 'redis';

// Only create Redis client if not in build time
let redisClient: ReturnType<typeof createClient> | null = null;

function getRedisClientInstance() {
  // Don't create client during build time
  if (process.env.NEXT_PHASE === 'phase-production-build' || (process.env.NODE_ENV === 'production' && !process.env.REDIS_HOST && !process.env.REDIS_URL)) {
    return null;
  }

  if (!redisClient) {
    // Support both REDIS_URL and REDIS_HOST/REDIS_PORT configuration
    let clientConfig: any;

    if (process.env.REDIS_URL) {
      // Parse REDIS_URL (supports redis:// and rediss:// for TLS)
      const url = new URL(process.env.REDIS_URL);
      const isTls = url.protocol === 'rediss:';
      
      clientConfig = {
        socket: {
          host: url.hostname,
          port: parseInt(url.port || '6379'),
          tls: isTls,
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              console.error('Redis: Too many reconnection attempts');
              return new Error('Too many retries');
            }
            return Math.min(retries * 50, 1000);
          },
        },
        password: url.password || process.env.REDIS_PASSWORD,
      };
    } else {
      // Use REDIS_HOST/REDIS_PORT configuration (no TLS by default)
      clientConfig = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          tls: process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === '1',
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              console.error('Redis: Too many reconnection attempts');
              return new Error('Too many retries');
            }
            return Math.min(retries * 50, 1000);
          },
        },
        password: process.env.REDIS_PASSWORD,
      };
    }

    redisClient = createClient(clientConfig);

    redisClient.on('error', (err) => {
      // Only log errors if not in build time
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.error('Redis Client Error', err);
      }
    });
    redisClient.on('connect', () => {
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.log('Redis: Connected');
      }
    });
    redisClient.on('ready', () => {
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.log('Redis: Ready');
      }
    });
    redisClient.on('reconnecting', () => {
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.log('Redis: Reconnecting');
      }
    });
  }

  return redisClient;
}

let connectionPromise: Promise<void> | null = null;

export async function getRedisClient() {
  // Don't connect during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  const client = getRedisClientInstance();
  if (!client) {
    return null;
  }

  // Check if already connected
  if (client.isOpen && client.isReady) {
    return client;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    await connectionPromise;
    return client;
  }

  // Start new connection
  connectionPromise = (async () => {
    try {
      if (!client.isOpen) {
        await client.connect();
      }
    } catch (error: any) {
      // If already connected, ignore the error
      if (error.message?.includes('Socket already opened') || error.message?.includes('already connected')) {
        // Client is already connected, just return it
        connectionPromise = null;
        return;
      }
      // During build, silently ignore connection errors
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        connectionPromise = null;
        return;
      }
      connectionPromise = null;
      throw error;
    }
    connectionPromise = null;
  })();

  await connectionPromise;
  return client;
}

// Cache helper functions
export async function getCache(key: string) {
  // Don't use Redis during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  try {
    const client = await getRedisClient();
    if (!client || !client.isReady) {
      return null;
    }
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error: any) {
    // Ignore connection errors, just return null (graceful degradation)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return null;
    }
    if (error.message?.includes('Socket already opened') || error.message?.includes('already connected')) {
      // Try to get value anyway if client is ready
      try {
        const client = getRedisClientInstance();
        if (client && client.isReady) {
          const value = await client.get(key);
          return value ? JSON.parse(value) : null;
        }
      } catch (e) {
        // Ignore
      }
    }
    // Only log errors if not in build time
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('Redis get error:', error.message || error);
    }
    return null;
  }
}

export async function setCache(key: string, value: any, ttl: number = 3600) {
  // Don't use Redis during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client || !client.isReady) {
      return;
    }
    await client.setEx(key, ttl, JSON.stringify(value));
  } catch (error: any) {
    // Ignore connection errors (graceful degradation)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }
    if (error.message?.includes('Socket already opened') || error.message?.includes('already connected')) {
      // Try to set anyway if client is ready
      try {
        const client = getRedisClientInstance();
        if (client && client.isReady) {
          await client.setEx(key, ttl, JSON.stringify(value));
          return;
        }
      } catch (e) {
        // Ignore
      }
    }
    // Only log errors if not in build time
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('Redis set error:', error.message || error);
    }
  }
}

export async function deleteCache(key: string) {
  // Don't use Redis during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client || !client.isReady) {
      return;
    }
    await client.del(key);
  } catch (error: any) {
    // Ignore connection errors (graceful degradation)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }
    if (error.message?.includes('Socket already opened') || error.message?.includes('already connected')) {
      try {
        const client = getRedisClientInstance();
        if (client && client.isReady) {
          await client.del(key);
          return;
        }
      } catch (e) {
        // Ignore
      }
    }
    // Only log errors if not in build time
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('Redis delete error:', error.message || error);
    }
  }
}

export async function deleteCachePattern(pattern: string) {
  // Don't use Redis during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client || !client.isReady) {
      return;
    }
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error: any) {
    // Ignore connection errors (graceful degradation)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }
    if (error.message?.includes('Socket already opened') || error.message?.includes('already connected')) {
      try {
        const client = getRedisClientInstance();
        if (client && client.isReady) {
          const keys = await client.keys(pattern);
          if (keys.length > 0) {
            await client.del(keys);
          }
          return;
        }
      } catch (e) {
        // Ignore
      }
    }
    // Only log errors if not in build time
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('Redis delete pattern error:', error.message || error);
    }
  }
}

