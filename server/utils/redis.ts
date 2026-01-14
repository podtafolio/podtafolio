import IORedis from "ioredis";

export const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
};

// Singleton connection for Queue (producers)
// Workers should create their own connections or use a fresh one
let _redisConnection: IORedis | null = null;

export function getRedisConnection() {
  if (!_redisConnection) {
    _redisConnection = new IORedis(redisOptions);
  }
  return _redisConnection;
}
