import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { BullModule } from '@nestjs/bullmq';
import { MediaProcessor } from './media.processor';
import { CleanupService } from './cleanup.service';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'media_queue',
    }),
    StorageModule,
    PrismaModule,
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaProcessor, CleanupService],
})
export class MediaModule {}
