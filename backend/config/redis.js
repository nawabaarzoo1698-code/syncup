const Redis = require("ioredis");
const logger = require("./logger");

let client = null;

const getRedisClient = () => {
  if (client) return client;

  client = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    // Auto-reconnect with exponential backoff
    retryStrategy: (times) => {
      const delay = Math.min(times * 200, 5000);
      logger.warn(`Redis reconnect attempt #${times} in ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false, // fail fast on commands when disconnected
    lazyConnect: true,
  });

  client.on("connect", () => logger.info("Redis connected."));
  client.on("ready", () => logger.info("Redis ready."));
  client.on("error", (err) => logger.error("Redis error.", { error: err.message }));
  client.on("close", () => logger.warn("Redis connection closed."));
  client.on("reconnecting", () => logger.warn("Redis reconnecting..."));

  return client;
};

// Safe wrappers — Redis should never crash the app
const safeGet = async (key) => {
  try {
    return await getRedisClient().get(key);
  } catch (err) {
    logger.error("Redis GET failed.", { key, error: err.message });
    return null;
  }
};

const safeSet = async (key, value, ttl) => {
  try {
    await getRedisClient().set(key, value, "EX", ttl);
  } catch (err) {
    logger.error("Redis SET failed.", { key, error: err.message });
  }
};

const safeDel = async (key) => {
  try {
    await getRedisClient().del(key);
  } catch (err) {
    logger.error("Redis DEL failed.", { key, error: err.message });
  }
};

module.exports = { getRedisClient, safeGet, safeSet, safeDel };
