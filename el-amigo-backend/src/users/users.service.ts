import { Injectable } from '@nestjs/common';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  private users: User[] = [];
  private idCounter = 1;

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async create(data: { email: string; password: string; fullName: string }): Promise<User> {
    const user: User = {
      id: this.idCounter++,
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }
}
