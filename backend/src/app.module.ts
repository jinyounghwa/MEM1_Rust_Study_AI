import { Module } from '@nestjs/common';
import { RustLearnModule } from './modules/rust-learn/rust-learn.module';
import { DatabaseModule } from './modules/database/database.module';

@Module({
  imports: [DatabaseModule, RustLearnModule],
})
export class AppModule {}
