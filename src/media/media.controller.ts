import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_FILE_SIZE } from '../common';
import { ParseOptionsPipe } from './pipes/parse-options.pipe';
import { Prisma } from '@prisma/client';
import { UploadMediaDto } from './dto/upload-media.dto';
import { UploadOptionsDto } from './dto/upload-options.dto';

@ApiExtraModels(UploadMediaDto, UploadOptionsDto)
@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an image for processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadMediaDto })
  @ApiCreatedResponse({
    description: 'File uploaded and queued successfully',
    schema: {
      example: {
        success: true,
        message: 'File uploaded and queued for processing',
        data: { mediaId: 'uuid' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded and queued successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file type or file too large',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_FILE_SIZE }),
          new FileTypeValidator({
            fileType: ALLOWED_IMAGE_MIME_TYPES,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('options', ParseOptionsPipe) transform?: Prisma.InputJsonValue,
  ) {
    return this.mediaService.processUpload(file, transform);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media status and download URL' })
  @ApiParam({
    name: 'id',
    description: 'Media ID returned from the upload enpdoint',
  })
  @ApiOkResponse({
    description: 'Media status returned successfully',
    schema: {
      example: {
        success: true,
        message: 'File processing completed successfully',
        data: {
          id: 'uuid',
          status: 'COMPLETED',
          originalName: 'image.jpg',
          outputs: {
            optimized: 'signed-download-url',
            thumbnail: 'signed-download-url',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media status returned successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Media not found' })
  async getStatus(@Param('id') id: string) {
    return this.mediaService.getMediaStatus(id);
  }
}
