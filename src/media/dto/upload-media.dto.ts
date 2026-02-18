import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { UploadOptionsDto } from './upload-options.dto';

export class UploadMediaDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file!: unknown;

  @ApiProperty({
    required: false,
    description:
      'Processing options. Can be a JSON string (multipart) or an object.',
    oneOf: [
      { type: 'string', example: '{"format":"webp","optimized":{"width":1280,"quality":80}}' },
      { $ref: getSchemaPath(UploadOptionsDto) },
    ],
  })
  options?: string | UploadOptionsDto;
}
