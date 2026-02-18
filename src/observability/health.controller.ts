import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('observability')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('media_queue') private readonly queue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Service health and dependency checks' })
  @ApiResponse({
    status: 200,
    description: 'Health status',
    schema: {
      example: {
        status: 'ok',
        dependencies: {
          db: { ok: true },
          redis: { ok: true },
        },
        timestamp: '2026-02-18T19:15:47.000Z',
      },
    },
  })
  async health() {
    const db = await this.checkDb();
    const redis = await this.checkRedis();

    const status = db.ok && redis.ok ? 'ok' : 'degraded';

    return {
      status,
      dependencies: {
        db,
        redis,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDb() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message };
    }
  }

  private async checkRedis() {
    try {
      await this.queue.getJobCounts();
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message };
    }
  }
}
