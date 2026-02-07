# ReachInbox - Production-Grade Email Scheduler

A production-grade email scheduler service with a dashboard for scheduling and viewing emails. Uses BullMQ + Redis for persistent job scheduling (no cron), Ethereal Email for fake SMTP, and PostgreSQL for data persistence.

## Architecture

- **Backend**: Express.js + TypeScript, BullMQ + Redis, PostgreSQL (Prisma)
- **Frontend**: Next.js + React + Tailwind CSS + TypeScript
- **Auth**: Google OAuth 2.0
- **Email**: Ethereal Email (fake SMTP for testing)

## Features

- Schedule emails with configurable start time
- Per-sender hourly rate limiting (Redis-backed)
- Minimum delay between individual sends
- Worker concurrency (configurable)
- Idempotent: same email queues are never sent twice
- Survives server restarts: jobs persist in Redis
- CSV/text file upload for bulk recipients

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for Redis & PostgreSQL)

> **Windows / OneDrive users:** See [SETUP.md](SETUP.md) for troubleshooting npm install and Prisma issues.

### 1. Start Infrastructure

```bash
docker-compose up -d
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
npm run db:push
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
5. Copy Client ID and Secret to backend `.env`

### 5. Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Scheduler Behavior

### Rate Limiting (Per Sender, Per Hour)

- **Config**: `MAX_EMAILS_PER_HOUR_PER_SENDER` (default: 100)
- **Storage**: Redis key `email_rate:{sender}:{YYYY-MM-DD-HH}` with TTL
- **Behavior**: When limit reached, jobs are **not dropped**. They are re-added with delay to the next hour window. Order is preserved as much as possible.

### Delay Between Emails

- **Config**: `DELAY_BETWEEN_EMAILS_MS` (default: 2000 = 2 seconds)
- **Implementation**: BullMQ limiter `{ max: 1, duration: delayBetweenMs }`
- **Effect**: Ensures a minimum gap between each send (mimics provider throttling)

### Worker Concurrency

- **Config**: `WORKER_CONCURRENCY` (default: 5)
- **Implementation**: BullMQ worker `concurrency` option
- **Safety**: Idempotency check before send; recipient status (PENDING/SENT/FAILED) prevents duplicates

### Under Load (1000+ Emails)

- Jobs are enqueued with staggered delays: `startTime + (index * delayBetweenMs)`
- BullMQ processes them in parallel (up to concurrency limit) with rate limiting
- Hourly limit causes overflow jobs to be delayed to next hour (re-queued)
- No jobs are lost; Redis and PostgreSQL persist state

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/auth/google | Redirect to Google OAuth |
| GET | /api/auth/google/callback | OAuth callback (redirects to frontend with token) |
| GET | /api/auth/me | Get current user (requires Bearer token) |
| POST | /api/emails/schedule | Schedule a campaign |
| GET | /api/emails/scheduled | List scheduled emails |
| GET | /api/emails/sent | List sent emails |

### Schedule Request Body

```json
{
  "subject": "Meeting follow-up",
  "body": "<p>Hello...</p>",
  "fromEmail": "user@domain.com",
  "recipients": ["a@x.com", "b@y.com"],
  "startTime": "2025-02-08T10:00:00.000Z",
  "delayBetweenMs": 2000,
  "hourlyLimit": 100
}
```

## Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL | Redis connection string |
| JWT_SECRET | Secret for JWT signing |
| GOOGLE_CLIENT_ID | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret |
| GOOGLE_CALLBACK_URL | OAuth callback URL |
| ETHEREAL_USER | (Optional) Ethereal SMTP user |
| ETHEREAL_PASS | (Optional) Ethereal SMTP pass |
| WORKER_CONCURRENCY | Number of parallel workers |
| DELAY_BETWEEN_EMAILS_MS | Min delay between sends (ms) |
| MAX_EMAILS_PER_HOUR_PER_SENDER | Per-sender hourly limit |
| FRONTEND_URL | Frontend URL for CORS/redirects |

### Frontend (.env.local)

| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_API_URL | Backend API URL |

## Project Structure

```
reachinbox/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/
│       ├── lib/         # mailer, redis, prisma, rateLimiter, passport
│       ├── middleware/  # auth
│       ├── queues/      # BullMQ email queue
│       ├── routes/      # auth, emails
│       ├── services/    # schedulerService
│       └── workers/     # emailWorker
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── context/
│       └── lib/
├── docker-compose.yml
└── README.md
```

## License

MIT
# Email-Scheduler
