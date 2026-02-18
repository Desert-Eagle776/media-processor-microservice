import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MediaController } from './../src/media/media.controller';
import { MediaService } from './../src/media/media.service';

describe('MediaController (e2e)', () => {
  let app: INestApplication;
  let controller: MediaController;
  const mediaServiceMock = {
    processUpload: jest.fn(),
    getMediaStatus: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mediaServiceMock,
        },
      ],
    }).compile();

    controller = moduleFixture.get(MediaController);
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('/media/:id (GET)', async () => {
    mediaServiceMock.getMediaStatus.mockResolvedValue({
      success: true,
      message: 'File processing completed successfully',
      data: {
        id: 'test-id',
        status: 'COMPLETED',
        originalName: 'image.jpg',
        outputs: {
          optimized: 'https://example.com/optimized.webp',
          thumbnail: 'https://example.com/thumbnail.webp',
        },
      },
    });

    await expect(controller.getStatus('test-id')).resolves.toMatchObject({
      success: true,
      data: { id: 'test-id' },
    });
    expect(mediaServiceMock.getMediaStatus).toHaveBeenCalledWith('test-id');
  });
});
