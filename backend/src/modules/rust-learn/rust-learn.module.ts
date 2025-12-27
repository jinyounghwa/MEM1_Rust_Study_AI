import { Module } from '@nestjs/common';
import { RustLearnController } from './rust-learn.controller';
import { RustLearnService } from './rust-learn.service';
import { ContextManagerModule } from '../context-manager/context-manager.module';
import { QwenModule } from '../qwen/qwen.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ContextManagerModule, QwenModule, DatabaseModule],
  controllers: [RustLearnController],
  providers: [RustLearnService],
})
export class RustLearnModule {}
