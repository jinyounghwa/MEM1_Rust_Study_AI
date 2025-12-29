import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { QwenService } from './modules/qwen/qwen.service';

async function warmupMLX(app: any) {
  console.log('🔥 MLX 모델 웜업 시작...');
  const startTime = Date.now();

  try {
    const qwenService = app.get(QwenService);

    // 헬스체크로 MLX 연결 확인
    const isHealthy = await qwenService.healthCheck();
    if (!isHealthy) {
      console.log('⚠️  MLX 서버 미연결 - 웜업 건너뜀');
      return;
    }

    // 간단한 웜업 요청 (KV 캐시 초기화)
    await qwenService.chat([
      { role: 'system', content: '당신은 Rust 튜터입니다.' },
      { role: 'user', content: '안녕' },
    ]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ MLX 웜업 완료 (${elapsed}초) - 첫 응답 속도가 빨라집니다`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log('⚠️  MLX 웜업 실패 (서버 시작은 계속됨):', errMsg);
  }
}

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

  // 백그라운드에서 MLX 웜업 실행 (서버 시작을 블로킹하지 않음)
  warmupMLX(app);
}

bootstrap().catch((err) => {
  console.error('❌ Backend startup error:', err);
  process.exit(1);
});
