import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class OutputOptionsDto {
  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(10000)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(10000)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quality?: number;
}

export class UploadOptionsDto {
  @IsOptional()
  @IsIn(['webp'])
  format?: 'webp';

  @IsOptional()
  @ValidateNested()
  @Type(() => OutputOptionsDto)
  optimized?: OutputOptionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OutputOptionsDto)
  thumbnail?: OutputOptionsDto;
}
