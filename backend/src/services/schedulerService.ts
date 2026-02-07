import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { emailQueue, scheduleEmailJob } from '../queues/emailQueue';
import { getSenderHourlyCount, getMsUntilNextHour } from '../lib/rateLimiter';
import { config } from '../config';

export interface ScheduleCampaignInput {
  userId: string;
  subject: string;
  body: string;
  fromEmail: string;
  recipients: string[];
  startTime: Date;
  delayBetweenMs?: number;
  hourlyLimit?: number;
}

export async function scheduleCampaign(input: ScheduleCampaignInput): Promise<string> {
  const {
    userId,
    subject,
    body,
    fromEmail,
    recipients,
    startTime,
    delayBetweenMs = config.scheduler.delayBetweenEmailsMs,
    hourlyLimit = config.scheduler.maxEmailsPerHourPerSender,
  } = input;

  const deduplicated = [...new Set(recipients.map((e) => e.toLowerCase().trim()))].filter(Boolean);
  if (deduplicated.length === 0) {
    throw new Error('No valid recipients');
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId,
      subject,
      body,
      fromEmail,
      startTime,
      delayBetweenMs,
      hourlyLimit,
      status: 'SCHEDULED',
      totalRecipients: deduplicated.length,
    },
  });

  const recipientsData = deduplicated.map((email, index) => ({
    campaignId: campaign.id,
    email,
    orderIndex: index,
  }));

  await prisma.campaignRecipient.createMany({
    data: recipientsData,
  });

  const startMs = startTime.getTime();
  const now = Date.now();

  const recipientsCreated = await prisma.campaignRecipient.findMany({
    where: { campaignId: campaign.id },
    orderBy: { orderIndex: 'asc' },
  });

  for (let i = 0; i < recipientsCreated.length; i++) {
    const rec = recipientsCreated[i];
    const delayForThisEmail = Math.max(0, startMs - now) + i * delayBetweenMs;
    await scheduleEmailJob(
      {
        campaignId: campaign.id,
        recipientId: rec.id,
        toEmail: rec.email,
        fromEmail,
        subject,
        body,
        orderIndex: i,
        userId,
        hourlyLimit,
      },
      delayForThisEmail
    );
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: 'IN_PROGRESS' },
  });

  return campaign.id;
}

export async function getScheduledEmails(userId: string) {
  const campaigns = await prisma.emailCampaign.findMany({
    where: {
      userId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
    },
    include: {
      recipients: {
        where: { status: 'PENDING' },
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  // Flatten to individual scheduled sends for UI
  const scheduled: Array<{
    id: string;
    campaignId: string;
    to: string;
    subject: string;
    scheduledTime: string;
    status: string;
  }> = [];
  for (const c of campaigns) {
    const baseTime = c.startTime.getTime();
    c.recipients.forEach((r, i) => {
      const scheduledTime = new Date(baseTime + i * c.delayBetweenMs);
      scheduled.push({
        id: r.id,
        campaignId: c.id,
        to: r.email,
        subject: c.subject,
        scheduledTime: scheduledTime.toISOString(),
        status: c.status === 'IN_PROGRESS' ? 'pending' : 'scheduled',
      });
    });
  }
  return scheduled;
}

export async function getSentEmails(userId: string, limit = 100) {
  return prisma.sentEmail.findMany({
    where: { userId },
    orderBy: { sentAt: 'desc' },
    take: limit,
  });
}

export async function getCampaignDetail(campaignId: string, userId: string) {
  return prisma.emailCampaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      recipients: { orderBy: { orderIndex: 'asc' } },
    },
  });
}
