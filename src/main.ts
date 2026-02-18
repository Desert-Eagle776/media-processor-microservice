import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const PORT = process.env.PORT || 3000;
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  const config = new DocumentBuilder()
    .setTitle('Media Processor API')
    .setDescription(
      'API for asynchronous image processing, optimization, and storage',
    )
    .setVersion('1.0.0')
    .addTag('media')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(PORT);
  console.log(
    `Server successfully started! Listening on ${await app.getUrl()}`,
  );
}
void bootstrap();
