import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @HttpCode(HttpStatus.OK)
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Post('report')
  @HttpCode(HttpStatus.OK)
  async generateReport(@Body() body: any) {
    return this.adminService.generateReport(body);
  }
}
