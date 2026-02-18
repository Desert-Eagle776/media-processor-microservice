import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { StorageBucketErrors } from '../common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.getOrThrow<string>('S3_REGION'),
      endpoint: this.config.getOrThrow<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: true,
    });

    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
  }

  async onModuleInit() {
    await this.ensureBucket(this.bucket);
  }

  private async ensureBucket(bucket: string) {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));

      this.logger.log(`S3 bucket exists: ${bucket}`);
    } catch (error: unknown) {
      const code = this.getErrorCode(error);

      this.logger.warn(
        `Bucket "${bucket}" not found (code=${code}). Creating...`,
      );

      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
        this.logger.log(`S3 bucket created: ${bucket}`);
      } catch (createError: unknown) {
        const name = this.getErrorName(createError);
        const status = this.getErrorStatus(createError);

        if (
          name === StorageBucketErrors.BucketAlreadyOwnedByYou ||
          name === StorageBucketErrors.BucketAlreadyExists ||
          status === HttpStatus.CONFLICT
        ) {
          this.logger.log(
            `Bucket already created by another instance: ${bucket}`,
          );
          return;
        }

        this.logger.error(`Failed to create bucket: ${bucket}`, createError);
        throw createError;
      }
    }
  }

  private getErrorCode(error: unknown): string | number | undefined {
    const e = this.asObject(error);
    const status = this.getErrorStatus(error);
    return this.readString(e, 'name') ?? this.readString(e, 'Code') ?? status;
  }

  private getErrorName(error: unknown): string | undefined {
    return this.readString(this.asObject(error), 'name');
  }

  private getErrorStatus(error: unknown): number | undefined {
    const e = this.asObject(error);
    const metadata = this.asObject(e.$metadata);
    const status = metadata.httpStatusCode;
    return typeof status === 'number' ? status : undefined;
  }

  private asObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') return {};
    return value as Record<string, unknown>;
  }

  private readString(
    obj: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = obj[key];
    return typeof value === 'string' ? value : undefined;
  }

  getClient(): S3Client {
    return this.s3;
  }

  getBucket(): string {
    return this.bucket;
  }
}
