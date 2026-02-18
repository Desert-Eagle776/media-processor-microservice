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
} from '@nestjs/swagger';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_FILE_SIZE } from '../common';
import { ParseOptionsPipe } from './pipes/parse-options.pipe';
import { Prisma } from '@prisma/client';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an image for processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        options: {
          type: 'string',
          description:
            'JSON string with processing options. Example: {"format":"webp","optimized":{"width":1280,"quality":80},"thumbnail":{"width":320,"quality":70}}',
        },
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media status returned successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Media not found' })
  async getStatus(@Param('id') id: string) {
    return this.mediaService.getMediaStatus(id);
  }
}
