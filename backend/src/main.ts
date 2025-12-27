import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(PORT);
  console.log(`🚀 RustLearn Backend running on http://localhost:${PORT}`);
}

bootstrap().catch((err) => {
  console.error('❌ Backend startup error:', err);
  process.exit(1);
});
