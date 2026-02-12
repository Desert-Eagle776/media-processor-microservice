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

@Processor('media_queue')
export class MediaProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(MediaProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<{ mediaId: string }>): Promise<any> {
    const { mediaId } = job.data;

    const s3Client = this.storage.getClient();
    const bucket = this.storage.getBucket();

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });
    if (media?.status === MediaStatus.COMPLETED && media.optimizedKey) {
      return;
    }

    await this.prisma.media.update({
      where: { id: mediaId },
      data: { status: MediaStatus.PROCESSING },
    });

    try {
      const resp = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: media?.originalKey }),
      );

      const stream = resp.Body as Readable;
      const chunks: Buffer[] = [];

      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const optimizedKey = `optimized/${randomUUID()}.webp`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: optimizedKey,
          Body: optimizedBuffer,
          ContentType: 'image/webp',
        }),
      );

      await this.prisma.media.update({
        where: { id: mediaId },
        data: { optimizedKey, status: MediaStatus.COMPLETED },
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
}
