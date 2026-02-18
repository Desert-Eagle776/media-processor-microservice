import { Injectable, NotFoundException } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from '../storage/storage.service';
import { randomUUID } from 'crypto';
import { MediaStatus, Prisma } from '@prisma/client';

@Injectable()
export class MediaService {
  constructor(
    @InjectQueue('media_queue') private mediaQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async processUpload(
    file: Express.Multer.File,
    transform?: Prisma.InputJsonValue,
  ) {
    const s3Client = this.storage.getClient();
    const bucket = this.storage.getBucket();

    const originalKey = `original/${randomUUID()}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: originalKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const media = await this.prisma.media.create({
      data: {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        status: MediaStatus.PENDING,
        originalKey,
        optimizedKey: null,
        thumbnailKey: null,
        transform,
      },
    });

    await this.mediaQueue.add(
      'transform',
      {
        mediaId: media.id,
      },
      {
        jobId: media.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 }, // 24h
      },
    );

    return {
      success: true,
      message: 'File uploaded and queued for processing',
      data: { mediaId: media.id },
    };
  }

  async getMediaStatus(id: string) {
    const s3Client = this.storage.getClient();
    const bucket = this.storage.getBucket();

    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('File not found');
    }

    const outputs: { optimized?: string; thumbnail?: string } = {};

    if (media?.status === MediaStatus.COMPLETED && media.optimizedKey) {
      outputs.optimized = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: media.optimizedKey,
        }),
        { expiresIn: 900 },
      );
    }

    if (media.status === MediaStatus.COMPLETED && media.thumbnailKey) {
      outputs.thumbnail = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: media.thumbnailKey,
        }),
        { expiresIn: 900 },
      );
    }

    return {
      success: true,
      message: this.getStatusMessage(media.status),
      data: {
        id: media.id,
        status: media.status,
        originalName: media.originalName,
        outputs,
      },
    };
  }

  private getStatusMessage(status: MediaStatus): string {
    switch (status) {
      case MediaStatus.PENDING:
        return 'File uploaded and queued for processing';
      case MediaStatus.PROCESSING:
        return 'File is currently being processed';
      case MediaStatus.COMPLETED:
        return 'File processing completed successfully';
      case MediaStatus.FAILED:
        return 'File processing failed';

      default:
        return 'Unknown media status';
    }
  }
}
