import { DexQuote, SwapResult } from '../types/order.js';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function generateMockTxHash(): string {
  return `${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
}

export class MockDexRouter {
  /**
   * Simulates Raydium quote fetching with network delay
   */
  async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote> {
    // Simulate network delay (200ms)
    await sleep(200);

    // Base price with variance (~2-4% difference)
    const basePrice = 25.5; // Mock price: 1 SOL = 25.5 USDC
    const variance = 0.98 + Math.random() * 0.04;
    const price = basePrice * variance;

    return {
      price,
      fee: 0.003, // 0.3% fee
      dex: 'raydium',
    };
  }

  /**
   * Simulates Meteora quote fetching with network delay
   */
  async getMeteorQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote> {
    // Simulate network delay (200ms)
    await sleep(200);

    // Base price with variance (~2-5% difference)
    const basePrice = 25.5;
    const variance = 0.97 + Math.random() * 0.05;
    const price = basePrice * variance;

    return {
      price,
      fee: 0.002, // 0.2% fee
      dex: 'meteora',
    };
  }

  /**
   * Fetches quotes from both DEXs and selects best price
   */
  async getOptimalQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number,
  ): Promise<{ quote: DexQuote; altQuote: DexQuote }> {
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteorQuote(tokenIn, tokenOut, amount),
    ]);

    // Select the better price (higher output for sell orders)
    const betterQuote = raydiumQuote.price > meteoraQuote.price ? raydiumQuote : meteoraQuote;
    const altQuote = raydiumQuote.price > meteoraQuote.price ? meteoraQuote : raydiumQuote;

    return { quote: betterQuote, altQuote };
  }

  /**
   * Simulates swap execution with realistic delay
   */
  async executeSwap(dex: string, tokenIn: string, tokenOut: string, amount: number, executedPrice: number): Promise<SwapResult> {
    // Simulate 2-3 second execution time
    await sleep(2000 + Math.random() * 1000);

    // Generate mock transaction hash
    const txHash = generateMockTxHash();

    return {
      txHash,
      executedPrice,
      dex,
    };
  }

  /**
   * Simulates slippage protection validation
   */
  validateSlippage(expectedPrice: number, executedPrice: number, slippageTolerance: number): boolean {
    const slippagePercent = Math.abs(expectedPrice - executedPrice) / expectedPrice;
    return slippagePercent <= slippageTolerance;
  }
}

export const dexRouter = new MockDexRouter();

