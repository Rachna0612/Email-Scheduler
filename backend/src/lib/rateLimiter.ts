import { redis } from './redis';
import { config } from '../config';

const RATE_LIMIT_KEY_PREFIX = 'email_rate:';
const TTL_SECONDS = 3660; // Slightly over 1 hour for safety

export async function getCurrentHourWindow(): Promise<string> {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
}

export async function incrementSenderHourlyCount(senderEmail: string): Promise<number> {
  const window = await getCurrentHourWindow();
  const key = `${RATE_LIMIT_KEY_PREFIX}${senderEmail}:${window}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, TTL_SECONDS);
  }
  return count;
}

export async function getSenderHourlyCount(senderEmail: string): Promise<number> {
  const window = await getCurrentHourWindow();
  const key = `${RATE_LIMIT_KEY_PREFIX}${senderEmail}:${window}`;
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}

export async function canSendEmail(
  senderEmail: string,
  limitOverride?: number
): Promise<boolean> {
  const count = await getSenderHourlyCount(senderEmail);
  const limit = limitOverride ?? config.scheduler.maxEmailsPerHourPerSender;
  return count < limit;
}

export async function getMsUntilNextHour(): Promise<number> {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1);
  nextHour.setMinutes(0, 0, 0);
  return nextHour.getTime() - now.getTime();
}
