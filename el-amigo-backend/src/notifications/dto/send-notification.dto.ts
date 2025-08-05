import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendNotificationDto {
  @IsNotEmpty()
  @IsString()
  to: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  channel?: string; // 'email', 'push', 'sms'
}
