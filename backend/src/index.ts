import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { config } from './config';
import './lib/passport';
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import { createEmailWorker } from './workers/emailWorker';

const app = express();
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Start worker
const worker = createEmailWorker();

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
