import { randomUUID } from 'crypto';
import { getPrismaClient } from '../config/database.js';
import { dexRouter } from './dex-router.js';
import { CreateOrderRequest, OrderResponse, WebSocketMessage } from '../types/order.js';

export interface WebSocketSubscriber {
  send: (data: WebSocketMessage) => void;
}

class OrderService {
  private wsSubscribers: Map<string, Set<WebSocketSubscriber>> = new Map();

  /**
   * Subscribe to order updates via WebSocket
   */
  subscribeToOrder(orderId: string, subscriber: WebSocketSubscriber): void {
    if (!this.wsSubscribers.has(orderId)) {
      this.wsSubscribers.set(orderId, new Set());
    }
    this.wsSubscribers.get(orderId)!.add(subscriber);
  }

  /**
   * Unsubscribe from order updates
   */
  unsubscribeFromOrder(orderId: string, subscriber: WebSocketSubscriber): void {
    const subscribers = this.wsSubscribers.get(orderId);
    if (subscribers) {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        this.wsSubscribers.delete(orderId);
      }
    }
  }

  /**
   * Broadcast order status update to all subscribers
   */
  private async broadcastOrderUpdate(orderId: string, message: WebSocketMessage): Promise<void> {
    const subscribers = this.wsSubscribers.get(orderId);
    if (subscribers) {
      for (const subscriber of subscribers) {
        try {
          subscriber.send(message);
        } catch (err) {
          console.error(`Failed to send message to subscriber: ${err}`);
        }
      }
    }
  }

  /**
   * Log order status change
   */
  private async logOrderStatus(orderId: string, status: string, message?: string): Promise<void> {
    const prisma = getPrismaClient();
    try {
      const order = await prisma.order.findUnique({ where: { orderId } });
      if (order) {
        await prisma.orderLog.create({
          data: {
            orderId: order.id,
            status,
            message,
            timestamp: new Date(),
          },
        });
      }
    } catch (err) {
      console.error(`Failed to log order status: ${err}`);
    }
  }

  /**
   * Create a new order
   */
  async createOrder(request: CreateOrderRequest): Promise<OrderResponse> {
    const prisma = getPrismaClient();
    const orderId = randomUUID();

    const order = await prisma.order.create({
      data: {
        orderId,
        status: 'pending',
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        amount: request.amount,
        slippage: request.slippage,
      },
    });

    await this.logOrderStatus(orderId, 'pending', 'Order created');

    return {
      orderId,
      status: 'pending',
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amount: request.amount,
    };
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string) {
    const prisma = getPrismaClient();
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: { logs: { orderBy: { timestamp: 'desc' } } },
    });
    return order;
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 20) {
    const prisma = getPrismaClient();
    return await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { logs: { take: 3, orderBy: { timestamp: 'desc' } } },
    });
  }

  /**
   * Process order through the execution flow
   */
  async processOrder(orderId: string): Promise<void> {
    const prisma = getPrismaClient();

    try {
      // Get order from database
      const order = await prisma.order.findUnique({ where: { orderId } });
      if (!order) {
        console.error(`Order not found: ${orderId}`);
        return;
      }

      // Step 1: Routing - Compare DEX prices
      await this.broadcastOrderUpdate(orderId, {
        orderId,
        status: 'routing',
        timestamp: new Date().toISOString(),
      });
      await this.logOrderStatus(orderId, 'routing', 'Comparing DEX prices');

      const { quote, altQuote } = await dexRouter.getOptimalQuote(
        order.tokenIn,
        order.tokenOut,
        order.amount,
      );

      console.log(`[${orderId}] Routing: ${quote.dex} (${quote.price}) vs ${altQuote.dex} (${altQuote.price})`);

      // Step 2: Building - Create transaction
      await this.broadcastOrderUpdate(orderId, {
        orderId,
        status: 'building',
        timestamp: new Date().toISOString(),
      });
      await this.logOrderStatus(
        orderId,
        'building',
        `Building swap transaction for ${quote.dex} at price ${quote.price}`,
      );

      // Validate slippage
      const isValidSlippage = dexRouter.validateSlippage(quote.price, quote.price, order.slippage);
      if (!isValidSlippage) {
        throw new Error(`Slippage exceeded: ${order.slippage}`);
      }

      // Step 3: Submitted - Send transaction
      await this.broadcastOrderUpdate(orderId, {
        orderId,
        status: 'submitted',
        timestamp: new Date().toISOString(),
      });
      await this.logOrderStatus(orderId, 'submitted', 'Submitting transaction to network');

      // Execute swap
      const result = await dexRouter.executeSwap(
        quote.dex,
        order.tokenIn,
        order.tokenOut,
        order.amount,
        quote.price,
      );

      // Step 4: Confirmed - Success
      await prisma.order.update({
        where: { orderId },
        data: {
          status: 'confirmed',
          selectedDex: quote.dex,
          executedPrice: result.executedPrice,
          txHash: result.txHash,
          updatedAt: new Date(),
        },
      });

      await this.broadcastOrderUpdate(orderId, {
        orderId,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        executedPrice: result.executedPrice,
        txHash: result.txHash,
      });
      await this.logOrderStatus(
        orderId,
        'confirmed',
        `Order confirmed with txHash: ${result.txHash}`,
      );

      console.log(`[${orderId}] ✓ Order confirmed: ${result.txHash}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${orderId}] ✗ Order failed: ${errorMessage}`);

      const currentOrder = await prisma.order.findUnique({ where: { orderId } });
      await prisma.order.update({
        where: { orderId },
        data: {
          status: 'failed',
          errorMessage,
          retryCount: (currentOrder?.retryCount ?? 0) + 1,
          updatedAt: new Date(),
        },
      });

      await this.broadcastOrderUpdate(orderId, {
        orderId,
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: errorMessage,
      });
      await this.logOrderStatus(orderId, 'failed', errorMessage);
    }
  }
}

export const orderService = new OrderService();

