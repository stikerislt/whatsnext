import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

function isDeployed(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_SERVICE_NAME)
  );
}

function corsOrigin():
  | string
  | string[]
  | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void) {
  const configured = (process.env.WEB_URL ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (configured.length === 1) return configured[0];
  if (configured.length > 1) return configured;
  if (isDeployed()) {
    return (origin, callback) => {
      if (!origin) return callback(null, true);
      const ok =
        /^https:\/\/[\w-]+\.netlify\.app$/.test(origin) ||
        /^https:\/\/[\w-]+\.up\.railway\.app$/.test(origin);
      callback(null, ok ? (origin as unknown as boolean) : false);
    };
  }
  return 'http://localhost:3000';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: corsOrigin(), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`What's Next API running on :${port}`);
}
bootstrap();
