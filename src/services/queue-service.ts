import { Queue, Worker, QueueEvents } from 'bullmq';
import { orderService } from './order-service.js';
import { env } from '../config/env.js';

interface OrderJob {
  orderId: string;
}

class QueueService {
  private queue: Queue<OrderJob> | null = null;
  private worker: Worker<OrderJob> | null = null;
  private queueEvents: QueueEvents | null = null;

  /**
   * Initialize the queue and worker
   */
  async initialize(): Promise<void> {
    // BullMQ connection options
    const redisUrl = new URL(env.REDIS_URL);
    const connection = {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379'),
      ...(redisUrl.password && { password: redisUrl.password }),
    };

    this.queue = new Queue<OrderJob>('orders', {
      connection,
      defaultJobOptions: {
        attempts: env.MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    });

    this.worker = new Worker<OrderJob>(
      'orders',
      async (job) => {
        console.info(`[Queue] Processing order: ${job.data.orderId}`);
        await orderService.processOrder(job.data.orderId);
        return { success: true };
      },
      {
        connection,
        concurrency: env.QUEUE_CONCURRENCY,
      },
    );

    this.queueEvents = new QueueEvents('orders', { connection });

    // Log queue events
    this.worker.on('completed', (job) => {
      console.info(`[Queue] ✓ Order processed: ${job.data.orderId}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[Queue] ✗ Order failed: ${job?.data.orderId} - ${err.message}`);
    });

    this.queueEvents.on('failed', ({ jobId }) => {
      console.warn(`[Queue] Job failed after retries: ${jobId}`);
    });

    console.info('✓ Queue service initialized');
  }

  /**
   * Add an order to the queue
   */
  async enqueueOrder(orderId: string): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    await this.queue.add('process-order', { orderId }, { jobId: orderId });
    console.info(`[Queue] Order enqueued: ${orderId}`);
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    if (!this.queue) {
      return null;
    }

    const [active, pending, completed, failed] = await Promise.all([
      this.queue.getActiveCount(),
      this.queue.getWaitingCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      active,
      pending,
      completed,
      failed,
      concurrency: env.QUEUE_CONCURRENCY,
    };
  }

  /**
   * Close the queue service
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    if (this.queueEvents) {
      await this.queueEvents.close();
    }
    console.info('✓ Queue service closed');
  }
}

export const queueService = new QueueService();

