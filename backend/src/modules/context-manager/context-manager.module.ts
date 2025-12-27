import { Module } from '@nestjs/common';
import { ContextManagerService } from './context-manager.service';

@Module({
  providers: [ContextManagerService],
  exports: [ContextManagerService],
})
export class ContextManagerModule {}
