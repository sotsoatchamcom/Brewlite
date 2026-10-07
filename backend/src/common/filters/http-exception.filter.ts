import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      // Ưu tiên lấy mảng message do ValidationPipe (DTO) trả ra, nếu không có thì lấy message mặc định
      message: exceptionResponse.message || exception.message,
      error: exceptionResponse.error || 'Lỗi hệ thống',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
