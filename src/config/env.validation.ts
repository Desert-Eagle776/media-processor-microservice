import Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Prisma/DB
  DATABASE_URL: Joi.string().required(),

  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),

  // MinIO (docker)
  MINIO_ROOT_USER: Joi.string().required(),
  MINIO_ROOT_PASSWORD: Joi.string().required(),

  // Redis/BullMQ
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().required(),

  // Bull-board (optional)
  BULL_PREFIX: Joi.string().default('bull'),
  QUEUES: Joi.string().default('media_queue'),

  // Storage (app)
  S3_REGION: Joi.string().required(),
  S3_BUCKET: Joi.string().default('uploads'),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_ENDPOINT: Joi.string().uri().required(),
}).unknown(true);
