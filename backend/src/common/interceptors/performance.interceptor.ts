import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const status = 'success';

        // 성능 표시 (이모지)
        const durationEmoji =
          duration < 100
            ? '⚡'
            : duration < 1000
              ? '✅'
              : duration < 5000
                ? '⚠️'
                : '🐌';

        const paddedMethod = method.padEnd(6);
        const paddedUrl = url.padEnd(50);

        this.logger.log(
          `${durationEmoji} [${paddedMethod}] ${paddedUrl} ${duration}ms`,
        );

        // 성능 경고 (5초 이상)
        if (duration > 5000) {
          this.logger.warn(
            `Slow request detected: ${method} ${url} took ${duration}ms`,
          );
        }
      }),
    );
  }
}
