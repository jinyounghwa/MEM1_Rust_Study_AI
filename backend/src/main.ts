import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // 성능 모니터링 인터셉터 등록
  app.useGlobalInterceptors(new PerformanceInterceptor());

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(PORT);
  console.log(`🚀 RustLearn Backend running on http://localhost:${PORT}`);
}

bootstrap().catch((err) => {
  console.error('❌ Backend startup error:', err);
  process.exit(1);
});
