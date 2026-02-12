# Media Processor Microservice

A backend microservice for asynchronous image processing using queues and background workers.

The service accepts image uploads, processes them asynchronously (converts to WebP and optimizes size), stores files in S3-compatible storage, and provides status tracking and download links.

---

## Features

- Asynchronous image processing using BullMQ
- Background workers with retries and exponential backoff
- Image optimization and conversion to WebP using Sharp
- S3-compatible storage (MinIO / AWS S3)
- Persistent job state stored in PostgreSQL
- Signed URLs for secure file downloads
- Scheduled cleanup of old processed files
- Fully Dockerized infrastructure
- Environment validation using Joi
- Clean, modular NestJS architecture

---

## Architecture Overview

The system is designed around a job lifecycle approach:

1. Client uploads an image
2. Metadata is saved in PostgreSQL with status PENDING
3. A background job is enqueued in BullMQ
4. Worker processes the image asynchronously
5. Result is stored as an optimized WebP file
6. Database status is updated (COMPLETED or FAILED)
7. Old files are periodically cleaned up via cron job

> **Database is the source of truth.**
> Queue is used only as a processing mechanism.

---

## Job Lifecycle (BullMQ)

| Status       | Meaning                         |
| ------------ | ------------------------------- |
| `PENDING`    | File uploaded, job queued       |
| `PROCESSING` | Worker is processing the image  |
| `COMPLETED`  | Image processed successfully    |
| `FAILED`     | Processing failed after retries |

### Reliability

- Jobs are retried up to **3 times**
- **Exponential backoff** is applied
- Worker is **idempotent** (safe to retry)
- Failed jobs remain inspectable

## Tech Stack

- Node.js / TypeScript
- NestJS
- BullMQ + Redis
- PostgreSQL + Prisma
- Sharp
- MinIO (S3-compatible storage)
- Bull Board (queue monitoring)
- Docker / Docker Compose
- Swagger (OpenAPI)
- Joi for environment validation

---

## Project Structure

```text
src/
├─ media/           # Upload API, service, worker
├─ storage/         # S3 / MinIO abstraction
├─ prisma/          # Prisma client & module
├─ common/          # Enums, constants, shared utils
├─ config/          # Environment validation (Joi)
└─ app.module.ts

```

## API Endpoints

### Upload file

`POST /media/upload`

- Accepts `multipart/form-data`
- Supported formats: `jpeg`, `png`, `webp`
- Max size: **5MB**

**Response**

```json
{
  "success": true,
  "data": {
    "mediaId": "uuid"
  }
}
```

### Get processing status

`GET /media/:id`

**Response**

```json
{
  "success": true,
  "message": "File processing completed successfully",
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "originalName": "image.jpg",
    "url": "signed-download-url"
  }
}
```

## Cleanup Strategy

A scheduled cron job removes old files:

- COMPLETED media → removed after 7 days

- FAILED media → removed after 2 days

This prevents storage growth and keeps the system clean.

## Environment Configuration

All environment variables are validated on startup using Joi.

Example configuration:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/media_db?schema=public

REDIS_HOST=localhost
REDIS_PORT=6379

S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=uploads
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
```

See .env.example for full configuration.

## Running the Project Locally

1. Start infrastructure
   docker compose up -d
2. Run migrations
   npx prisma migrate dev
   npx prisma generate
3. Run the application
   npm install
   npm run start:dev
4. Open Swagger
   http://localhost:3000/api

## Bull Board (Queue Monitoring)

BullMQ jobs can be inspected using Bull Board UI:
http://localhost:3001

## Author

> **Nazar**
> **Backend Developer (Node.js / NestJS)**
