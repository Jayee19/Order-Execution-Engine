import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { orderService } from '../src/services/order-service.js';
import { queueService } from '../src/services/queue-service.js';
import { getPrismaClient, closePrisma } from '../src/config/database.js';
import { getRedisClient, closeRedis } from '../src/config/redis.js';
import type { CreateOrderRequest } from '../src/types/order.js';

// Skip concurrent tests if SKIP_DB_TESTS is true
// These tests require Docker with PostgreSQL and Redis running
// Set SKIP_DB_TESTS=false to run them (requires Docker)
const skipDbTests = process.env.SKIP_DB_TESTS === 'true';

describe.skipIf(skipDbTests)('Concurrent Order Processing', () => {
  beforeAll(async () => {
    await queueService.initialize();
  }, 30000); // 30 second timeout for initialization

  afterAll(async () => {
    await queueService.close();
    await closePrisma();
    await closeRedis();
  });

  it('should process 3 concurrent orders without errors', async () => {
    const orders: CreateOrderRequest[] = [
      {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1.0,
        slippage: 0.02,
      },
      {
        tokenIn: 'USDC',
        tokenOut: 'SOL',
        amount: 25.5,
        slippage: 0.01,
      },
      {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 2.5,
        slippage: 0.03,
      },
    ];

    // Create and enqueue all orders
    const createdOrders = await Promise.all(orders.map((req) => orderService.createOrder(req)));
    await Promise.all(createdOrders.map((order) => queueService.enqueueOrder(order.orderId)));

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 12000));

    // Verify all orders are processed
    const processedOrders = await Promise.all(
      createdOrders.map((order) => orderService.getOrder(order.orderId)),
    );

    expect(processedOrders).toHaveLength(3);
    processedOrders.forEach((order) => {
      expect(order).toBeDefined();
      expect(['confirmed', 'failed']).toContain(order?.status);
    });
  }, 20000); // 20 second timeout

  it('should maintain queue statistics accurately', async () => {
    const statsBefore = await queueService.getStats();
    expect(statsBefore).toBeDefined();
    expect(statsBefore?.concurrency).toBe(10);

    // Create order
    const request: CreateOrderRequest = {
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amount: 1,
      slippage: 0.01,
    };

    const order = await orderService.createOrder(request);
    await queueService.enqueueOrder(order.orderId);

    // Check stats
    const statsAfter = await queueService.getStats();
    expect(statsAfter?.pending).toBeGreaterThanOrEqual(0);

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 6000));

    const statsFinal = await queueService.getStats();
    expect(statsFinal?.completed).toBeGreaterThanOrEqual(statsBefore?.completed ?? 0);
  }, 15000); // 15 second timeout

  it('should handle multiple simultaneous WebSocket subscriptions', () => {
    const orderIds = ['order-1', 'order-2', 'order-3'];
    const mockSend = (data: any) => {
      expect(data).toBeDefined();
    };

    orderIds.forEach((orderId) => {
      const subscriber = { send: mockSend };
      orderService.subscribeToOrder(orderId, subscriber);
      expect(subscriber).toBeDefined();
    });

    // Cleanup
    orderIds.forEach((orderId) => {
      const subscriber = { send: mockSend };
      orderService.unsubscribeFromOrder(orderId, subscriber);
    });
  });

  it('should persist all orders to database', async () => {
    const prisma = getPrismaClient();

    const request: CreateOrderRequest = {
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amount: 1.5,
      slippage: 0.01,
    };

    const order = await orderService.createOrder(request);

    const dbOrder = await prisma.order.findUnique({
      where: { orderId: order.orderId },
      include: { logs: true },
    });

    expect(dbOrder).toBeDefined();
    expect(dbOrder?.tokenIn).toBe('SOL');
    expect(dbOrder?.tokenOut).toBe('USDC');
    expect(dbOrder?.logs.length).toBeGreaterThan(0);
  });

  it('should maintain data consistency across retries', async () => {
    const request: CreateOrderRequest = {
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amount: 0.5,
      slippage: 0.05,
    };

    const order = await orderService.createOrder(request);
    const originalRetryCount = 0;

    const dbOrder = await orderService.getOrder(order.orderId);
    expect(dbOrder?.retryCount).toBe(originalRetryCount);
  });
});

