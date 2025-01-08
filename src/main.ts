import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as compression from 'compression';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const corsConfig: CorsOptions = {
    origin: '*',
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
  };

  const app = await NestFactory.create(AppModule, {
    cors: corsConfig,
    bodyParser: true,
  });

  // compress response
  app.use(compression());

  const port = process.env.PORT || 3002;
  await app.listen(port);

  // log using port number
  console.log(`Serving on http://localhost:${port}`);
}

bootstrap();
