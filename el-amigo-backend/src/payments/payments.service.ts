import { Injectable, BadRequestException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';

// Reemplaza con integración real de Stripe/MercadoPago según el caso
@Injectable()
export class PaymentsService {
  async createPayment(dto: CreatePaymentDto) {
    // Lógica de integración real aquí (ejemplo, pseudo-código)
    if (!dto.amount || dto.amount <= 0) throw new BadRequestException('Monto inválido');

    // Aquí va la llamada real a Stripe/MercadoPago SDK
    return {
      status: 'success',
      provider: dto.provider, // 'stripe' o 'mercadopago'
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      paymentUrl: 'https://link-externo-pago.com', // Devuelve el link real del proveedor
    };
  }
}
