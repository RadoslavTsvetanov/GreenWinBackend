import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
    return `Hello World! Base URL: ${baseUrl}`;
  }
}
