import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { LogEventDto } from './dto/log-event.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('log')
  @HttpCode(HttpStatus.CREATED)
  async logEvent(@Body() dto: LogEventDto) {
    return this.analyticsService.logEvent(dto);
  }
}
