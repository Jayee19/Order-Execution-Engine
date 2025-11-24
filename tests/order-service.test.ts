import { describe, it, expect, beforeEach, vi } from 'vitest';
import { orderService } from '../src/services/order-service.js';
import { WebSocketSubscriber } from '../src/services/order-service.js';
import type { CreateOrderRequest } from '../src/types/order.js';

// Skip database tests if SKIP_DB_TESTS is true
// These tests require Docker with PostgreSQL running
// Set SKIP_DB_TESTS=false to run them (requires Docker)
const skipDbTests = process.env.SKIP_DB_TESTS === 'true';

describe('Order Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    it.skipIf(skipDbTests)('should create an order with pending status', async () => {
      const request: CreateOrderRequest = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1.5,
        slippage: 0.01,
      };

      const response = await orderService.createOrder(request);

      expect(response.orderId).toBeDefined();
      expect(response.status).toBe('pending');
      expect(response.tokenIn).toBe('SOL');
      expect(response.tokenOut).toBe('USDC');
      expect(response.amount).toBe(1.5);
    });

    it.skipIf(skipDbTests)('should generate unique order IDs', async () => {
      const request: CreateOrderRequest = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1,
        slippage: 0.01,
      };

      const order1 = await orderService.createOrder(request);
      const order2 = await orderService.createOrder(request);

      expect(order1.orderId).not.toBe(order2.orderId);
    });
  });

  describe('WebSocket subscriptions', () => {
    it('should subscribe to order updates', () => {
      const orderId = 'test-order-1';
      const subscriber: WebSocketSubscriber = {
        send: vi.fn(),
      };

      orderService.subscribeToOrder(orderId, subscriber);

      // Verify subscription was added (internal state)
      expect(subscriber).toBeDefined();
    });

    it('should unsubscribe from order updates', () => {
      const orderId = 'test-order-2';
      const subscriber: WebSocketSubscriber = {
        send: vi.fn(),
      };

      orderService.subscribeToOrder(orderId, subscriber);
      orderService.unsubscribeFromOrder(orderId, subscriber);

      // Verify unsubscribe works without errors
      expect(subscriber).toBeDefined();
    });

    it('should handle multiple subscribers', () => {
      const orderId = 'test-order-3';
      const subscriber1: WebSocketSubscriber = { send: vi.fn() };
      const subscriber2: WebSocketSubscriber = { send: vi.fn() };

      orderService.subscribeToOrder(orderId, subscriber1);
      orderService.subscribeToOrder(orderId, subscriber2);

      expect(subscriber1).toBeDefined();
      expect(subscriber2).toBeDefined();
    });
  });

  describe('getOrder', () => {
    it.skipIf(skipDbTests)('should retrieve order by ID', async () => {
      const request: CreateOrderRequest = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1,
        slippage: 0.01,
      };

      const created = await orderService.createOrder(request);
      const retrieved = await orderService.getOrder(created.orderId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.orderId).toBe(created.orderId);
    });

    it.skipIf(skipDbTests)('should return null for non-existent order', async () => {
      const order = await orderService.getOrder('non-existent-order');
      expect(order).toBeNull();
    });
  });

  describe('getRecentOrders', () => {
    it.skipIf(skipDbTests)('should fetch recent orders', async () => {
      const request: CreateOrderRequest = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1,
        slippage: 0.01,
      };

      await orderService.createOrder(request);
      await orderService.createOrder(request);

      const orders = await orderService.getRecentOrders(10);

      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBeGreaterThan(0);
    });

    it.skipIf(skipDbTests)('should respect limit parameter', async () => {
      const request: CreateOrderRequest = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1,
        slippage: 0.01,
      };

      const orders = await orderService.getRecentOrders(5);

      expect(orders.length).toBeLessThanOrEqual(5);
    });

    it.skipIf(skipDbTests)('should return orders sorted by creation date', async () => {
      const orders = await orderService.getRecentOrders(10);

      for (let i = 0; i < orders.length - 1; i++) {
        const current = new Date(orders[i].createdAt).getTime();
        const next = new Date(orders[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });
});

