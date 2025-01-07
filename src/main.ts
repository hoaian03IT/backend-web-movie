import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3002;
  await app.listen(port);

  // log using port number
  console.log(`Serving on http://localhost:${port}`);
}

bootstrap();
