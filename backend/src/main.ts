import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Thêm tiền tố toàn cục /api cho toàn bộ endpoint
  app.setGlobalPrefix('api');

  // 2. Đảm bảo thư mục uploads luôn tồn tại khi chạy cục bộ để không bị crash
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  // Mở quyền truy cập thư mục uploads qua đường dẫn /uploads/...
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  // 3. Mở CORS động: Tự động cho phép mọi client (localhost, Render frontend, preview domains)
  // Kết hợp cùng credentials: true mà không sợ lỗi chặn header Access-Control-Allow-Origin
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 4. Thiết lập Validation Pipe toàn cục
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        stopAtFirstError: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
  );

  // 5. Cấu hình Swagger API Docs
  const config = new DocumentBuilder()
      .setTitle('BrewLite API')
      .setDescription('API cho hệ thống đặt nước BrewLite')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // 6. Lắng nghe cổng và tự động nhận diện Domain hiển thị log
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

  console.log(`[NestJS] API Server running on: ${baseUrl}/api`);
  console.log(`[NestJS] Swagger Docs running on: ${baseUrl}/api/docs`);
}
bootstrap();