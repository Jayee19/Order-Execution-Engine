import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPrismaClient, closePrisma } from '../src/config/database.js';
import { getRedisClient, closeRedis } from '../src/config/redis.js';
import { queueService } from '../src/services/queue-service.js';
import { orderService } from '../src/services/order-service.js';
import type { CreateOrderRequest } from '../src/types/order.js';

// Skip integration tests if SKIP_DB_TESTS is true
// These tests require Docker with PostgreSQL and Redis running
// Set SKIP_DB_TESTS=false to run them (requires Docker)
const skipDbTests = process.env.SKIP_DB_TESTS === 'true';

describe.skipIf(skipDbTests)('Integration Tests', () => {
  beforeAll(async () => {
    // Initialize queue for integration tests
    await queueService.initialize();
  }, 30000);

  afterAll(async () => {
    await queueService.close();
    await closePrisma();
    await closeRedis();
  });

  describe('Order Processing Pipeline', () => {
    it('should process order through complete pipeline', async () => {
      const request: CreateOrderRequest = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1,
        slippage: 0.05,
      };

      // Create order
      const orderResponse = await orderService.createOrder(request);
      expect(orderResponse.status).toBe('pending');

      // Enqueue order
      await queueService.enqueueOrder(orderResponse.orderId);

      // Wait for processing (with timeout)
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Check order status
      const processedOrder = await orderService.getOrder(orderResponse.orderId);
      expect(processedOrder).toBeDefined();
      expect(['confirmed', 'failed']).toContain(processedOrder?.status);
    }, 15000); // 15 second timeout

    it('should handle concurrent order processing', async () => {
      const requests: CreateOrderRequest[] = Array.from({ length: 5 }, () => ({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1 + Math.random(),
        slippage: 0.05,
      }));

      // Create all orders
      const orders = await Promise.all(requests.map((req) => orderService.createOrder(req)));
      expect(orders).toHaveLength(5);

      // Enqueue all orders
      await Promise.all(orders.map((order) => queueService.enqueueOrder(order.orderId)));

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Verify all orders are processed
      const processedOrders = await Promise.all(
        orders.map((order) => orderService.getOrder(order.orderId)),
      );

      processedOrders.forEach((order) => {
        expect(['confirmed', 'failed']).toContain(order?.status);
      });
    }, 20000); // 20 second timeout for 5 concurrent orders
  });

  describe('Queue Statistics', () => {
    it('should provide queue statistics', async () => {
      const stats = await queueService.getStats();

      expect(stats).toBeDefined();
      expect(stats?.active).toBeGreaterThanOrEqual(0);
      expect(stats?.pending).toBeGreaterThanOrEqual(0);
      expect(stats?.completed).toBeGreaterThanOrEqual(0);
      expect(stats?.failed).toBeGreaterThanOrEqual(0);
      expect(stats?.concurrency).toBe(10);
    }, 10000); // 10 second timeout
  });

  describe('Database Operations', () => {
    it('should persist orders to database', async () => {
      const request: CreateOrderRequest = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 2.5,
        slippage: 0.01,
      };

      const orderResponse = await orderService.createOrder(request);
      const prisma = getPrismaClient();
      const dbOrder = await prisma.order.findUnique({
        where: { orderId: orderResponse.orderId },
      });

      expect(dbOrder).toBeDefined();
      expect(dbOrder?.tokenIn).toBe('SOL');
      expect(dbOrder?.tokenOut).toBe('USDC');
      expect(dbOrder?.amount).toBe(2.5);
    });

    it('should retrieve order logs', async () => {
      const request: CreateOrderRequest = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1,
        slippage: 0.01,
      };

      const orderResponse = await orderService.createOrder(request);
      const order = await orderService.getOrder(orderResponse.orderId);

      expect(order?.logs).toBeDefined();
      expect(Array.isArray(order?.logs)).toBe(true);
    });
  });
});

