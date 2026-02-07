import { Queue, QueueEvents } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { config } from '../config';

const connection = getRedisConnection();

export const EMAIL_QUEUE_NAME = 'email-send';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, { connection });

export interface EmailJobData {
  campaignId: string;
  recipientId: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  body: string;
  orderIndex: number;
  userId: string;
  hourlyLimit?: number;
}

export async function scheduleEmailJob(
  data: EmailJobData,
  delayMs: number,
  jobIdOverride?: string
): Promise<string> {
  const jobId = jobIdOverride || `${data.campaignId}-${data.recipientId}`;
  const job = await emailQueue.add('send-email', data, {
    delay: delayMs,
    jobId,
  });
  return job.id!;
}
