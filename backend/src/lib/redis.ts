import IORedis from 'ioredis';
import { config } from '../config';

export const redis = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const getRedisConnection = () => new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
});
