import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { orderService } from '../services/order-service.js';
import { queueService } from '../services/queue-service.js';
import { CreateOrderRequest } from '../types/order.js';

const createOrderSchema = z.object({
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amount: z.number().positive(),
  slippage: z.number().min(0).max(1).default(0.01),
});

export async function registerOrderRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/orders/execute
   * Creates an order and upgrades connection to WebSocket
   */
  app.post<{ Body: CreateOrderRequest }>(
    '/api/orders/execute',
    async (request: FastifyRequest<{ Body: CreateOrderRequest }>, reply: FastifyReply) => {
      try {
        // Validate request
        const validated = createOrderSchema.parse(request.body);

        // Create order
        const orderResponse = await orderService.createOrder(validated);

        // Enqueue order for processing
        await queueService.enqueueOrder(orderResponse.orderId);

        // Note: WebSocket upgrade happens automatically via Fastify WebSocket plugin
        // Client should connect to ws://host/api/orders/execute after POST

        return reply.code(200).send(orderResponse);
      } catch (error) {
        const message = error instanceof z.ZodError ? error.errors[0].message : (error as Error).message;
        return reply.code(400).send({ error: message });
      }
    },
  );

  /**
   * GET /api/orders/:orderId
   * Get order details by ID
   */
  app.get<{ Params: { orderId: string } }>(
    '/api/orders/:orderId',
    async (request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      try {
        const { orderId } = request.params;
        const order = await orderService.getOrder(orderId);

        if (!order) {
          return reply.code(404).send({ error: 'Order not found' });
        }

        return reply.send(order);
      } catch (error) {
        return reply.code(500).send({ error: (error as Error).message });
      }
    },
  );

  /**
   * GET /api/orders
   * Get recent orders
   */
  app.get(
    '/api/orders',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const orders = await orderService.getRecentOrders(20);
        return reply.send(orders);
      } catch (error) {
        return reply.code(500).send({ error: (error as Error).message });
      }
    },
  );

  /**
   * WebSocket /api/orders/:orderId/ws
   * Subscribe to order updates via WebSocket
   */
  app.get<{ Params: { orderId: string } }>(
    '/api/orders/:orderId/ws',
    { websocket: true },
    (connection, request: FastifyRequest<{ Params: { orderId: string } }>) => {
      const { orderId } = request.params;

      // Subscribe to order updates
      const subscriber = {
        send: (data: unknown) => {
          try {
            connection.socket.send(JSON.stringify(data));
          } catch (err) {
            console.error(`Failed to send WebSocket message: ${err}`);
          }
        },
      };

      orderService.subscribeToOrder(orderId, subscriber);

      // Send initial connection message
      connection.socket.send(
        JSON.stringify({
          orderId,
          status: 'connected',
          message: 'Subscribed to order updates',
          timestamp: new Date().toISOString(),
        }),
      );

      // Handle disconnect
      connection.socket.on('close', () => {
        orderService.unsubscribeFromOrder(orderId, subscriber);
      });

      // Handle errors
      connection.socket.on('error', (error: Error) => {
        console.error(`WebSocket error for order ${orderId}:`, error);
        orderService.unsubscribeFromOrder(orderId, subscriber);
      });
    },
  );
}

