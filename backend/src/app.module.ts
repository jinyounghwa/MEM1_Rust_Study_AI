import { Module } from '@nestjs/common';
import { RustLearnModule } from './modules/rust-learn/rust-learn.module';

@Module({
  imports: [RustLearnModule],
})
export class AppModule {}
