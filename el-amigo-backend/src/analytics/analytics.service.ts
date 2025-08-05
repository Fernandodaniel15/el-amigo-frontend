import { Injectable, BadRequestException } from '@nestjs/common';
import { LogEventDto } from './dto/log-event.dto';

@Injectable()
export class AnalyticsService {
  private events: any[] = [];

  async logEvent(dto: LogEventDto) {
    if (!dto.event || !dto.userId) throw new BadRequestException('Datos incompletos');
    const event = {
      ...dto,
      timestamp: new Date(),
    };
    this.events.push(event);
    // Aquí podrías enviar el evento a un sistema real de analytics (Mixpanel, Amplitude, BigQuery, etc)
    return { status: 'ok', event };
  }
}
