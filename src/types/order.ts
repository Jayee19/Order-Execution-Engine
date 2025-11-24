export interface CreateOrderRequest {
  tokenIn: string;
  tokenOut: string;
  amount: number;
  slippage: number;
}

export interface OrderResponse {
  orderId: string;
  status: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
}

export interface WebSocketMessage {
  orderId: string;
  status: 'pending' | 'routing' | 'building' | 'submitted' | 'confirmed' | 'failed';
  timestamp: string;
  executedPrice?: number;
  txHash?: string;
  error?: string;
}

export interface DexQuote {
  price: number;
  fee: number;
  dex: 'raydium' | 'meteora';
}

export interface SwapResult {
  txHash: string;
  executedPrice: number;
  dex: string;
}

export type OrderStatus = 'pending' | 'routing' | 'building' | 'submitted' | 'confirmed' | 'failed';

