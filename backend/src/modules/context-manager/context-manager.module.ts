import { Module } from '@nestjs/common';
import { ContextManagerService } from './context-manager.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ContextManagerService],
  exports: [ContextManagerService],
})
export class ContextManagerModule {}
