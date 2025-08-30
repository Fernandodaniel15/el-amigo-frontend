import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Seguridad HTTP headers
  app.use(helmet());

  // Limitar intentos de auth: max 5 peticiones cada 15 minutos
  app.use('/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { mensaje: 'Demasiados intentos, vuelve a intentarlo más tarde.' },
  }));

  // Parseo de cookies para usar httpOnly
  app.use(cookieParser());

   // Parseo de cookies
  app.use(cookieParser());

  // **CORS completo para tu frontend**
  app.enableCors({
    origin: 'http://localhost:3001',
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','Accept','Origin','X-Requested-With'],
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
