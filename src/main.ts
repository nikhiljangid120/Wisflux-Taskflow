// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import {SwaggerModule, DocumentBuilder} from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // strip properties not declared in the DTO
      forbidNonWhitelisted: true, // throw 400 if extra properties are sent
      transform: true,            // auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // "5" -> 5, "true" -> true, etc.
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("TaskFlow API")
    .setDescription("TaskFlow API description")
    .setVersion("0.1.1")
    .build();
    // .addBearerAuth()  // for JWT later

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document)  


  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 TaskFlow API running on http://localhost:${port}`);
}
bootstrap();