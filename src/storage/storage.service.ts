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
    } catch (e) {
      const code = e?.name || e?.Code || e?.$metadata?.httpStatusCode;

      this.logger.warn(
        `Bucket "${bucket}" not found (code=${code}). Creating...`,
      );

      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
        this.logger.log(`S3 bucket created: ${bucket}`);
      } catch (createErr) {
        const name = createErr?.name;
        const status = createErr?.$metadata?.httpStatusCode;

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

        this.logger.error(`Failed to create bucket: ${bucket}`, createErr);
        throw createErr;
      }
    }
  }

  getClient(): S3Client {
    return this.s3;
  }

  getBucket(): string {
    return this.bucket;
  }
}
