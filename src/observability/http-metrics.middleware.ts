import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { MetricsController } from './metrics.controller';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const diffNs = process.hrtime.bigint() - start;
      const durationMs = Number(diffNs) / 1_000_000;
      const route = req.route?.path || req.path || 'unknown';

      MetricsController.observeRequest(
        req.method,
        route,
        res.statusCode,
        durationMs,
      );
    });

    next();
  }
}
