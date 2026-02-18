import { BadRequestException } from '@nestjs/common';
import { ParseOptionsPipe } from './parse-options.pipe';

describe('ParseOptionsPipe', () => {
  const pipe = new ParseOptionsPipe();

  it('returns undefined when options are not provided', () => {
    expect(pipe.transform(undefined)).toBeUndefined();
  });

  it('parses valid options payload', () => {
    const result = pipe.transform(
      JSON.stringify({
        format: 'webp',
        optimized: { width: 1200, quality: 80 },
      }),
    );

    expect(result).toEqual({
      format: 'webp',
      optimized: { width: 1200, quality: 80 },
    });
  });

  it('throws for invalid json', () => {
    expect(() => pipe.transform('{not-json')).toThrow(BadRequestException);
  });

  it('throws when options payload is not an object', () => {
    expect(() => pipe.transform('[]')).toThrow(BadRequestException);
  });

  it('throws for unknown fields', () => {
    expect(() =>
      pipe.transform(
        JSON.stringify({ optimized: { width: 100 }, extra: true }),
      ),
    ).toThrow(BadRequestException);
  });
});
