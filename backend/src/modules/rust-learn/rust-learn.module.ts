import { Module } from '@nestjs/common';
import { RustLearnController } from './rust-learn.controller';
import { RustLearnService } from './rust-learn.service';
import { ContextManagerModule } from '../context-manager/context-manager.module';
import { QwenModule } from '../qwen/qwen.module';

@Module({
  imports: [ContextManagerModule, QwenModule],
  controllers: [RustLearnController],
  providers: [RustLearnService],
})
export class RustLearnModule {}
