import { Router } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import {
  scheduleCampaign,
  getScheduledEmails,
  getSentEmails,
  getCampaignDetail,
} from '../services/schedulerService';

const router = Router();

router.use(authMiddleware);

router.post('/schedule', async (req: AuthRequest, res) => {
  try {
    const { subject, body, fromEmail, recipients, startTime, delayBetweenMs, hourlyLimit } = req.body;
    const userId = req.user!.id;

    if (!subject || !body || !fromEmail || !Array.isArray(recipients) || recipients.length === 0 || !startTime) {
      return res.status(400).json({
        error: 'Missing required fields: subject, body, fromEmail, recipients, startTime',
      });
    }

    const campaignId = await scheduleCampaign({
      userId,
      subject,
      body,
      fromEmail,
      recipients,
      startTime: new Date(startTime),
      delayBetweenMs,
      hourlyLimit,
    });

    return res.json({ campaignId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to schedule';
    return res.status(400).json({ error: message });
  }
});

router.get('/scheduled', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const scheduled = await getScheduledEmails(userId);
    return res.json(scheduled);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch';
    return res.status(500).json({ error: message });
  }
});

router.get('/sent', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const sent = await getSentEmails(userId);
    return res.json(sent.map((e) => ({
      id: e.id,
      to: e.toEmail,
      subject: e.subject,
      sentAt: e.sentAt.toISOString(),
      status: e.status.toLowerCase(),
    })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch';
    return res.status(500).json({ error: message });
  }
});

router.get('/campaign/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const campaign = await getCampaignDetail(req.params.id, userId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    return res.json(campaign);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch';
    return res.status(500).json({ error: message });
  }
});

export default router;
