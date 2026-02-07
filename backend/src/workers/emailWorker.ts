import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { sendEmail } from '../lib/mailer';
import { prisma } from '../lib/prisma';
import {
  canSendEmail,
  incrementSenderHourlyCount,
  getMsUntilNextHour,
} from '../lib/rateLimiter';
import { config } from '../config';
import { EmailJobData, emailQueue, scheduleEmailJob } from '../queues/emailQueue';

const connection = getRedisConnection();

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { campaignId, recipientId, toEmail, fromEmail, subject, body, userId, orderIndex, hourlyLimit } = job.data;

  // Idempotency: Check if already sent
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
  });

  if (!recipient || recipient.status !== 'PENDING') {
    return; // Already processed or doesn't exist
  }

  // Rate limit check - per sender per hour (Redis-backed, safe across workers)
  const allowed = await canSendEmail(fromEmail, hourlyLimit);
  if (!allowed) {
    const delayMs = await getMsUntilNextHour();
    // Re-add job with delay to next hour - don't drop, preserve order
    await scheduleEmailJob(
      { campaignId, recipientId, toEmail, fromEmail, subject, body, orderIndex, userId, hourlyLimit },
      delayMs,
      `${campaignId}-${recipientId}-retry-${Date.now()}`
    );
    return; // Current job "passes through" - new delayed job will process later
  }

  // Minimum delay between sends (handled by BullMQ limiter)
  const result = await sendEmail({
    from: fromEmail,
    to: toEmail,
    subject,
    html: body,
  });

  if (result.success) {
    await prisma.$transaction([
      prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'SENT', sentAt: new Date() },
      }),
      prisma.sentEmail.create({
        data: {
          campaignId,
          userId,
          toEmail,
          subject,
          body,
          fromEmail,
          status: 'SENT',
          sentAt: new Date(),
        },
      }),
      prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { processedCount: { increment: 1 } },
      }),
    ]);

    await incrementSenderHourlyCount(fromEmail);
  } else {
    await prisma.$transaction([
      prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'FAILED' },
      }),
      prisma.sentEmail.create({
        data: {
          campaignId,
          userId,
          toEmail,
          subject,
          body,
          fromEmail,
          status: 'FAILED',
          sentAt: new Date(),
          errorMessage: result.error,
        },
      }),
    ]);

    throw new Error(result.error || 'Send failed');
  }
}

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    'email-send',
    async (job: Job<EmailJobData>) => {
      await processEmailJob(job);
    },
    {
      connection,
      concurrency: config.scheduler.workerConcurrency,
      limiter: {
        max: 1,
        duration: config.scheduler.delayBetweenEmailsMs,
      },
    }
  );

  worker.on('failed', async (job, err) => {
    console.error(`Job ${job?.id} failed:`, err?.message);
  });

  return worker;
}
