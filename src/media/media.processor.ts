import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import sharp from 'sharp';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { MediaStatus } from '@prisma/client';
import { MediaTransformOptions } from '../common';

@Processor('media_queue')
export class MediaProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(MediaProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<{ mediaId: string }>): Promise<void> {
    const { mediaId } = job.data;

    const s3Client = this.storage.getClient();
    const bucket = this.storage.getBucket();

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      this.logger.warn(`Media not found: ${mediaId}`);
      return;
    }

    if (
      media.status === MediaStatus.COMPLETED &&
      media.optimizedKey &&
      media.thumbnailKey
    )
      return;

    await this.prisma.media.update({
      where: { id: mediaId },
      data: { status: MediaStatus.PROCESSING },
    });

    try {
      const resp = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: media.originalKey }),
      );

      const stream = this.toReadable(resp.Body);
      const chunks: Buffer[] = [];
      for await (const chunk of stream as AsyncIterable<
        Buffer | Uint8Array | string
      >) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      const transform = this.parseTransform(media.transform);
      const optimizedOpts = transform.optimized ?? { width: 1280, quality: 80 };
      const thumbOpts = transform.thumbnail ?? { width: 320, quality: 70 };

      const optimizedKey = `optimized/${randomUUID()}.webp`;
      const thumbnailKey = `thumbnails/${randomUUID()}.webp`;

      const optimizedBuffer = await sharp(buffer)
        .resize({
          width: optimizedOpts.width,
          height: optimizedOpts.height,
          withoutEnlargement: true,
        })
        .webp({ quality: optimizedOpts.quality ?? 80 })
        .toBuffer();

      const thumbnailBuffer = await sharp(buffer)
        .resize({
          width: thumbOpts.width,
          height: thumbOpts.height,
          withoutEnlargement: true,
        })
        .webp({ quality: thumbOpts.quality ?? 70 })
        .toBuffer();

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: optimizedKey,
          Body: optimizedBuffer,
          ContentType: 'image/webp',
        }),
      );

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/webp',
        }),
      );

      await this.prisma.media.update({
        where: { id: mediaId },
        data: { optimizedKey, thumbnailKey, status: MediaStatus.COMPLETED },
      });
    } catch (e) {
      this.logger.error(`Job ${job.id} failed:`, e);

      await this.prisma.media.update({
        where: { id: mediaId },
        data: { status: MediaStatus.FAILED },
      });

      throw e;
    }
  }

  private toReadable(body: unknown): Readable {
    if (!(body instanceof Readable)) {
      throw new Error('S3 object body is not a readable stream');
    }
    return body;
  }

  private parseTransform(value: unknown): MediaTransformOptions {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as MediaTransformOptions;
  }
}
