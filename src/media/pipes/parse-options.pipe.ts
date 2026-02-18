import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { UploadOptionsDto } from '../dto/upload-options.dto';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Prisma } from '@prisma/client';
import { OptionsFormValue, TransformJson } from 'src/common';

@Injectable()
export class ParseOptionsPipe implements PipeTransform<
  OptionsFormValue,
  TransformJson
> {
  transform(value: OptionsFormValue): TransformJson {
    console.log(`Parse Options Pipe: ${value}`);
    if (!value) return undefined;

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
      console.log(`Parsed: ${parsed}`);
    } catch {
      throw new BadRequestException('Invalid JSON in "options"');
    }

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      throw new BadRequestException('"options" must be a JSON object');
    }

    const dto = plainToInstance(UploadOptionsDto, parsed, {
      enableImplicitConversion: true,
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) {
      throw new BadRequestException({
        message: 'Invalid "options" payload',
        errors,
      });
    }

    return instanceToPlain(dto) as Prisma.InputJsonValue;
  }
}
