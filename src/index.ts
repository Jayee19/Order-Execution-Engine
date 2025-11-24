import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { env } from './config/env.js';
import { getPrismaClient, closePrisma } from './config/database.js';
import { getRedisClient, closeRedis } from './config/redis.js';
import { queueService } from './services/queue-service.js';
import { registerOrderRoutes } from './routes/orders.js';
import { registerHealthRoutes } from './routes/health.js';

async function main(): Promise<void> {
  // Initialize connections
  console.info('🚀 Starting Order Execution Engine...');

  try {
    // Connect to database
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    console.info('✓ Database connected');

    // Connect to Redis
    const redis = await getRedisClient();
    console.info('✓ Redis connected');

    // Initialize queue
    await queueService.initialize();

    // Create Fastify server
    const app = Fastify({
      logger: env.NODE_ENV === 'development',
    });

    // Register WebSocket plugin
    await app.register(fastifyWebsocket);

    // Register routes
    await registerHealthRoutes(app);
    await registerOrderRoutes(app);

    // Start server
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.info(`✓ Server running on http://localhost:${env.PORT}`);

    // Graceful shutdown
    const gracefulShutdown = async (): Promise<void> => {
      console.info('\n📛 Shutting down gracefully...');

      try {
        await app.close();
        await queueService.close();
        await closePrisma();
        await closeRedis();
        console.info('✓ Server closed');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();

