import { Injectable, BadRequestException } from '@nestjs/common';
import { SendNotificationDto } from './dto/send-notification.dto';

// Aquí iría la integración real con proveedor de notificaciones (Firebase, OneSignal, Email, SMS, etc.)
@Injectable()
export class NotificationsService {
  async send(dto: SendNotificationDto) {
    if (!dto.to || !dto.message) throw new BadRequestException('Datos incompletos');
    // Lógica de envío real aquí
    return {
      status: 'sent',
      to: dto.to,
      channel: dto.channel,
      message: dto.message,
    };
  }
}
