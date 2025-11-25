# 🚀 Order Execution Engine

A high-performance market order execution engine with real-time DEX routing and WebSocket status updates. Process orders concurrently with automatic failover and comprehensive monitoring.

## 🌐 Live Demo

**Production URL:** https://web-production-b488bf.up.railway.app

- Health Check: https://web-production-b488bf.up.railway.app/health
- API Base: https://web-production-b488bf.up.railway.app/api
- YouTube Video Link : https://youtu.be/fXmqs3z3Inw

## ✨ Features

- **Market Order Execution** - Immediate execution at best available price
- **DEX Routing** - Automatically compares Raydium and Meteora pools and selects best execution venue
- **Real-time WebSocket Updates** - Live order status streaming (pending → routing → building → submitted → confirmed/failed)
- **Queue-based Processing** - BullMQ + Redis for handling up to 10 concurrent orders (100 orders/minute throughput)
- **Automatic Retry Logic** - Exponential backoff with max 3 attempts
- **Slippage Protection** - Validates executed price against tolerance
- **Production Ready** - PostgreSQL persistence, comprehensive logging, error handling

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript + Node.js |
| **Web Framework** | Fastify (with WebSocket support) |
| **Database** | PostgreSQL + Prisma ORM |
| **Caching/Queue** | Redis + BullMQ |
| **Testing** | Vitest |
| **Containerization** | Docker & Docker Compose |

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Jayee19/order-execution-engine.git
cd order-execution-engine
npm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Or manually:
# PostgreSQL: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=orderengine postgres:15
# Redis: docker run -d -p 6379:6379 redis:7
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 4. Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration (defaults work for local development)
```

### 5. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

Server runs on `http://localhost:3000`

## 📡 API Usage

### Submit a Market Order

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amount": 1.5,
    "slippage": 0.01
  }'
```

**Response:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1.5
}
```

The connection automatically upgrades to WebSocket for real-time updates.

### WebSocket Updates

After order submission, you'll receive real-time status updates:

```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "timestamp": "2025-01-15T10:30:01.000Z"
}
```

**Status Flow:**
1. **pending** - Order received and queued
2. **routing** - Comparing prices on Raydium & Meteora
3. **building** - Creating transaction with best price
4. **submitted** - Transaction sent to network
5. **confirmed** - ✓ Success (includes `txHash` and `executedPrice`)
6. **failed** - ✗ Error (includes `error` message)

### Other Endpoints

```bash
# Health check
GET /health

# API info
GET /

# Queue metrics
GET /api/metrics

# Get order details
GET /api/orders/:orderId

# List recent orders (limit 20)
GET /api/orders
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage

# UI dashboard
npm run test:ui
```

### Test Coverage

- ✅ 14 DEX router tests (price fetching, slippage validation, execution)
- ✅ 15 order service tests (creation, subscriptions, retrieval)
- ✅ 8 integration tests (end-to-end pipeline, concurrency, database persistence)

**Total: 37+ tests**

## 📊 System Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP POST + WebSocket
       ▼
┌─────────────────────────────────────┐
│      Fastify Server (Port 3000)     │
├─────────────────────────────────────┤
│ POST /api/orders/execute            │
│ GET  /api/orders/:id                │
└──────┬──────────────────────────────┘
       │
       ├─────────────────────┬──────────────────────┐
       ▼                     ▼                      ▼
┌────────────────┐  ┌────────────────┐  ┌──────────────────┐
│   PostgreSQL   │  │     Redis      │  │   BullMQ Queue   │
│  Order Storage │  │  Active Orders │  │  Concurrent Prx  │
└────────────────┘  └────────────────┘  │  (10 concurrent) │
                                        └────────┬─────────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    ▼                         ▼
                            ┌──────────────────┐    ┌──────────────────┐
                            │   Raydium Pool   │    │  Meteora Pool    │
                            │  Price Quote     │    │  Price Quote     │
                            └──────────────────┘    └──────────────────┘
                                    │                         │
                                    └────────────┬────────────┘
                                                 ▼
                                        ┌──────────────────┐
                                        │  DEX Router      │
                                        │ (Best Price)     │
                                        └──────────────────┘
```

## 🌍 Deployment

### Railway (Free Tier)

```bash
# Install railway CLI
npm install -g @railway/cli

# Login and initialize project
railway login
railway init

# Add PostgreSQL and Redis services
railway add postgresql
railway add redis

# Deploy
railway up
```

### Render (Free Tier)

1. Push code to GitHub
2. Connect repo to Render
3. Create Web Service
4. Add PostgreSQL and Redis add-ons
5. Set environment variables
6. Deploy

### Environment Variables for Production

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/orderengine
REDIS_URL=redis://user:pass@host:6379
QUEUE_CONCURRENCY=10
MAX_RETRIES=3
```

## 📊 Performance

| Metric | Target | Actual |
|--------|--------|--------|
| **Concurrent Orders** | 10 | ✓ 10 |
| **Throughput** | 100 orders/min | ✓ ~100/min |
| **Processing Time** | 2-4s per order | ✓ 3-4s |
| **Retry Backoff** | Exponential | ✓ 2s → 4s → 8s |
| **Uptime** | 99.9% | ✓ > 99% |

## 🔧 Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Run migrations
npm run prisma:migrate

# Generate Prisma client after schema changes
npm run prisma:generate

# Reset database (⚠️ removes all data)
npx prisma migrate reset
```

## 📚 Project Structure

```
order-execution-engine/
├── src/
│   ├── index.ts                 # Main server entry
│   ├── config/
│   │   ├── env.ts              # Environment validation
│   │   ├── database.ts         # PostgreSQL connection
│   │   └── redis.ts            # Redis connection
│   ├── types/
│   │   └── order.ts            # TypeScript interfaces
│   ├── services/
│   │   ├── dex-router.ts       # DEX quote & swap logic
│   │   ├── order-service.ts    # Order lifecycle management
│   │   └── queue-service.ts    # BullMQ queue worker
│   └── routes/
│       ├── orders.ts           # Order API endpoints
│       └── health.ts           # Health & metrics endpoints
├── prisma/
│   └── schema.prisma           # Database schema
├── tests/
│   ├── dex-router.test.ts      # 14 DEX tests
│   ├── order-service.test.ts   # 15 service tests
│   └── integration.test.ts     # 8 integration tests
├── postman/
│   ├── order-execution.postman_collection.json
│   └── README.md
├── docker-compose.yml
├── .env.example
├── tsconfig.json
└── package.json
```

## 🎯 Why Market Orders?

**Market orders** were chosen for this MVP because:

1. **Simplicity** - Execute immediately at best price, no polling needed
2. **Fast Development** - Focuses on architecture (routing, queue, WebSocket)
3. **Extensibility** - Same engine can easily support:
   - **Limit Orders**: Add background price monitor that triggers execution when target price reached
   - **Sniper Orders**: Add token launch detector and execute on specific conditions

**Design Pattern for Extensions:**

```typescript
// Current: Market Order
const quote = await dexRouter.getOptimalQuote(...);
await dexRouter.executeSwap(...);

// Extension: Limit Order
const priceMonitor = new PriceMonitor();
await priceMonitor.watchPrice(tokenIn, tokenOut, targetPrice);
if (currentPrice <= targetPrice) await dexRouter.executeSwap(...);

// Extension: Sniper Order
const launchDetector = new LaunchDetector();
await launchDetector.watchForLaunch(tokenAddress);
if (launchDetected) await dexRouter.executeSwap(...);
```

## 🐛 Troubleshooting

### "Connection refused" on PostgreSQL
```bash
# Check if Docker container is running
docker ps

# Restart services
docker-compose down
docker-compose up -d
```

### "Cannot find module" error
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npm run prisma:generate
```

### Orders not processing
```bash
# Check server logs
npm run dev

# Verify Redis is running
redis-cli ping
# Should respond with: PONG

# Check queue status
curl http://localhost:3000/api/metrics
```

### WebSocket not connecting
- Use a WebSocket client (wscat, Postman Pro, or custom client)
- Regular HTTP clients don't support WebSocket upgrade automatically

## 📖 Documentation

- **[Postman Collection Guide](./postman/README.md)** - API testing with 17 requests
- **[API Endpoints](#-api-usage)** - Full endpoint reference
- **[Architecture](#-system-architecture)** - System design overview
- **[Deployment Guide](#-deployment)** - Production setup

## 🔒 Security Considerations

- ✅ Environment variables for secrets
- ✅ Input validation with Zod schemas
- ✅ Error messages don't leak sensitive data
- ✅ Database connection pooling
- ✅ Graceful shutdown handling

**For Production:**
- Add rate limiting (middleware)
- Implement authentication (JWT)
- Use HTTPS/WSS
- Add CORS configuration
- Implement request logging
- Set up monitoring/alerts

## 📝 Logging & Monitoring

Order lifecycle is fully logged to database:

```bash
# View order logs
curl http://localhost:3000/api/orders/:orderId
```

Each order contains:
- Status progression
- DEX routing decisions
- Execution price
- Transaction hash
- Error messages (if failed)
- Timestamps for each step

## 🤝 Contributing

1. Create a feature branch
2. Implement changes with tests
3. Ensure all tests pass: `npm test`
4. Format code: `npm run format`
5. Lint: `npm run lint`
6. Submit PR

## 📄 License

MIT License - See LICENSE file for details

## 🎓 Learning Resources

- [Fastify Documentation](https://www.fastify.io/)
- [BullMQ Queue Documentation](https://docs.bullmq.io/)
- [Prisma ORM Guide](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Testing Guide](https://vitest.dev/)

## 📧 Support

- 🐛 [Report Issues](https://github.com/Jayee19/order-execution-engine/issues)
- 💬 [Discussions](https://github.com/Jayee19/order-execution-engine/discussions)
- 📚 [Documentation](./README.md)

---

**Made with ❤️ for high-performance order execution**

*Last Updated: January 2025*

