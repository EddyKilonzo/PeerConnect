import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());

  // Compression middleware
  app.use(compression());

  // Enable CORS
  app.enableCors({
    origin: [
      // Development
      'http://localhost:4200', // Angular frontend dev server
      'http://localhost:3000', // Backend dev server
      'http://localhost:3001', // Alternative frontend port

      // Production Frontend (Vercel)
      'https://peerconnect-frontend.vercel.app',
      'https://peerconnect.vercel.app',

      // Production Backend (Render)
      'https://peerconnect-api.onrender.com', // Main backend domain
      'https://*.onrender.com', // Render subdomain
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-API-Key',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Current-Page'],
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit conversion
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('PeerConnect API')
    .setDescription('AI-Assisted Peer Counseling Platform API Documentation')
    .setVersion('1.0')
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Users', 'User management and profile operations')
    .addTag('Listeners', 'Peer listener management and operations')
    .addTag('Topics', 'Topic selection and management')
    .addTag('Groups', 'Group creation and management')
    .addTag('Resources', 'Resource sharing and management')
    .addTag('Chat', 'Real-time chat functionality')
    .addTag('Meetings', 'Meeting scheduling and management')
    .addTag('AI', 'AI-powered features and assistance')
    .addTag('Admin', 'Administrative operations')
    .addTag('Notifications', 'User notification system')
    .addTag('Cloudinary', 'File upload and media management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // Important for @ApiBearerAuth() decorator
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'PeerConnect API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6; font-size: 36px; }
      .swagger-ui .info .description { font-size: 16px; }
    `,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
