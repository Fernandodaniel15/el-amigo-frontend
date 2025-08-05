import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LogEventDto {
  @IsNotEmpty()
  @IsString()
  event: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  details?: string;
}
