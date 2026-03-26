import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  app.enableCors();

  // Apply global API prefix
  app.setGlobalPrefix('api');
  
  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('GreenWin Backend API')
    .setDescription('API documentation for GreenWin Backend with JWT Authentication')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'access-token',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT-refresh',
        description: 'Enter JWT refresh token',
        in: 'header',
      },
      'refresh-token',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('tasks', 'Task management endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup('api/docs', app as any, document);
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
