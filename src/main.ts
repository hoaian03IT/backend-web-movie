import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as compression from 'compression';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const corsConfig: CorsOptions = {
    origin: 'http://localhost:3000',
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

  // validation pipe for global configuration
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      dismissDefaultMessages: true,
      validationError: {
        target: true,
        value: true,
      },
      forbidUnknownValues: true,
    }),
  );

  // compress response
  app.use(compression());

  // cookie parser
  app.use(cookieParser());

  const port = process.env.PORT || 3002;
  await app.listen(port);

  // log using port number
  console.log(`Serving on http://localhost:${port}`);
}

bootstrap();
