import { Module } from '@nestjs/common';
import { MistralModule } from './mistral/mistral.module';

@Module({
  imports: [MistralModule],
})
export class AppModule {}
