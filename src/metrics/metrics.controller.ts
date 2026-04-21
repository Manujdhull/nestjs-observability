import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    const registry = this.metricsService.getRegistry();
    res.set('Content-Type', registry.contentType);
    const metrics = await registry.metrics();
    res.status(200).send(metrics);
  }
}
