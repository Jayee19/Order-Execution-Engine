import { describe, it, expect, beforeEach } from 'vitest';
import { MockDexRouter } from '../src/services/dex-router.js';

describe('DEX Router', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
  });

  describe('getRaydiumQuote', () => {
    it('should fetch Raydium quote with reasonable price', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 1);
      expect(quote.price).toBeGreaterThan(20);
      expect(quote.price).toBeLessThan(30);
      expect(quote.fee).toBe(0.003);
      expect(quote.dex).toBe('raydium');
    });

    it('should have consistent quote format', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 1);
      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('fee');
      expect(quote).toHaveProperty('dex');
    });
  });

  describe('getMeteorQuote', () => {
    it('should fetch Meteora quote with reasonable price', async () => {
      const quote = await router.getMeteorQuote('SOL', 'USDC', 1);
      expect(quote.price).toBeGreaterThan(20);
      expect(quote.price).toBeLessThan(30);
      expect(quote.fee).toBe(0.002);
      expect(quote.dex).toBe('meteora');
    });
  });

  describe('getOptimalQuote', () => {
    it('should return best quote and alternative', async () => {
      const result = await router.getOptimalQuote('SOL', 'USDC', 1);

      expect(result.quote).toBeDefined();
      expect(result.altQuote).toBeDefined();
      expect(['raydium', 'meteora']).toContain(result.quote.dex);
      expect(['raydium', 'meteora']).toContain(result.altQuote.dex);
      expect(result.quote.dex).not.toBe(result.altQuote.dex);
    });

    it('best quote should have better price than alternative', async () => {
      const result = await router.getOptimalQuote('SOL', 'USDC', 1);
      expect(result.quote.price).toBeGreaterThanOrEqual(result.altQuote.price);
    });

    it('should handle concurrent quote requests', async () => {
      const results = await Promise.all([
        router.getOptimalQuote('SOL', 'USDC', 1),
        router.getOptimalQuote('SOL', 'USDC', 1),
        router.getOptimalQuote('SOL', 'USDC', 1),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.quote).toBeDefined();
      });
    });
  });

  describe('validateSlippage', () => {
    it('should accept prices within slippage tolerance', () => {
      const isValid = router.validateSlippage(25.5, 25.2, 0.05);
      expect(isValid).toBe(true);
    });

    it('should reject prices exceeding slippage tolerance', () => {
      const isValid = router.validateSlippage(25.5, 20, 0.05);
      expect(isValid).toBe(false);
    });

    it('should handle zero slippage', () => {
      const isValid = router.validateSlippage(25.5, 25.5, 0);
      expect(isValid).toBe(true);
    });

    it('should handle high slippage tolerance', () => {
      const isValid = router.validateSlippage(100, 50, 0.5);
      expect(isValid).toBe(true);
    });
  });

  describe('executeSwap', () => {
    it('should return valid swap result', async () => {
      const result = await router.executeSwap('raydium', 'SOL', 'USDC', 1, 25.5);

      expect(result.txHash).toBeDefined();
      expect(result.txHash).toHaveLength(64);
      expect(result.executedPrice).toBe(25.5);
      expect(result.dex).toBe('raydium');
    });

    it('should generate unique transaction hashes', async () => {
      const result1 = await router.executeSwap('raydium', 'SOL', 'USDC', 1, 25.5);
      const result2 = await router.executeSwap('raydium', 'SOL', 'USDC', 1, 25.5);

      expect(result1.txHash).not.toBe(result2.txHash);
    }, 10000); // 10 second timeout (2 swaps × 3 seconds each = 6 seconds max)
  });
});

