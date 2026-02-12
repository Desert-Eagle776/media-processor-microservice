import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MediaStatus } from '@prisma/client';
import {
  COMPLETED_RETENTION_DAYS,
  FAILED_RETENTION_DAYS,
  MAX_DELETE_BATCH,
} from '../common';

@Injectable()
export class CleanupService {
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Europe/Kyiv' })
  async handleCleanup() {
    const s3Client = this.storage.getClient();
    const bucket = this.storage.getBucket();

    const completedBefore = this.daysAgo(COMPLETED_RETENTION_DAYS);
    const failedBefore = this.daysAgo(FAILED_RETENTION_DAYS);

    let deleted = 0;
    let failed = 0;

    this.logger.debug('Starting media cleanup process...');

    const oldMedia = await this.prisma.media.findMany({
      where: {
        OR: [
          {
            status: MediaStatus.COMPLETED,
            updatedAt: { lt: completedBefore },
          },
          {
            status: MediaStatus.FAILED,
            updatedAt: { lt: failedBefore },
          },
        ],
      },
      select: { id: true, originalKey: true, optimizedKey: true, status: true },
      take: MAX_DELETE_BATCH,
    });

    for (const media of oldMedia) {
      try {
        if (media.originalKey) {
          await s3Client.send(
            new DeleteObjectCommand({ Bucket: bucket, Key: media.originalKey }),
          );
        }

        if (media.optimizedKey) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: media.optimizedKey,
            }),
          );
        }

        await this.prisma.media.deleteMany({ where: { id: media.id } });

        deleted++;
        this.logger.log(`Deleted media: ${media.id} (${media.status})`);
      } catch (e: any) {
        failed++;
        this.logger.error(
          `Failed to delete media ${media.id}: ${e?.message ?? e}`,
        );
      }
    }

    this.logger.log(
      `Cleanup finished. candidates: ${oldMedia.length}, deleted=${deleted}, failed=${failed}`,
    );
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * CleanupService.DAY_MS);
  }
}
