import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email ya registrado');
    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hash, fullName: dto.fullName },
    });
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { user: { id: user.id, email: user.email }, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Credenciales inválidas');
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { user: { id: user.id, email: user.email }, token };
  }

  refresh(token: string) {
    const payload = this.jwt.verify(token);
    const newToken = this.jwt.sign({ sub: payload.sub, email: payload.email });
    return { token: newToken };
  }
}
