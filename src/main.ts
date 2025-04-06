import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  console.log(
    'MISTRAL_API_KEY:',
    process.env.MISTRAL_API_KEY ? 'Loaded' : 'Missing',
  );

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:5555',
    methods: 'GET, POST, PUT, DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });

  await app.listen(4444);
  console.log('Server is running on http://localhost:4444');
}
bootstrap();
