import { Controller, Get } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

const registry = new Registry();
collectDefaultMetrics({ register: registry });

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000],
  registers: [registry],
});

@ApiTags('observability')
@Controller('metrics')
export class MetricsController {
  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics',
    schema: {
      example:
        '# HELP http_requests_total Total number of HTTP requests\n' +
        '# TYPE http_requests_total counter\n' +
        'http_requests_total{method="GET",route="/health",status="200"} 3\n',
    },
  })
  async metrics() {
    return registry.metrics();
  }

  static observeRequest(
    method: string,
    route: string,
    status: number,
    durationMs: number,
  ) {
    const labels = {
      method,
      route,
      status: status.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationMs.observe(labels, durationMs);
  }
}
