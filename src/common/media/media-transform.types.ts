import { Prisma } from '@prisma/client';

export type OptionsFormValue = string | undefined;
export type TransformJson = Prisma.InputJsonValue | undefined;

export type TransformOutputOptions = {
  width?: number;
  height?: number;
  quality?: number;
};

export type MediaTransformOptions = {
  format?: 'webp';
  optimized?: TransformOutputOptions;
  thumbnail?: TransformOutputOptions;
};
