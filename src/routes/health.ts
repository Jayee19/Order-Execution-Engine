import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { queueService } from '../services/queue-service.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /health
   * Health check endpoint
   */
  app.get(
    '/health',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await queueService.getStats();
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queue: stats,
      });
    },
  );

  /**
   * GET /
   * API info
   */
  app.get(
    '/',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        name: 'Order Execution Engine',
        version: '1.0.0',
        description: 'Market order execution with DEX routing and WebSocket updates',
        endpoints: {
          'POST /api/orders/execute': 'Submit an order (upgrades to WebSocket)',
          'GET /api/orders/:orderId': 'Get order details',
          'GET /api/orders': 'List recent orders',
          'GET /api/metrics': 'Get queue metrics',
          'GET /health': 'Health check',
        },
      });
    },
  );

  /**
   * GET /api/metrics
   * Queue and system metrics
   */
  app.get(
    '/api/metrics',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await queueService.getStats();
      return reply.send({
        timestamp: new Date().toISOString(),
        queue: stats,
      });
    },
  );
}

