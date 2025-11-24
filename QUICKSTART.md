# Quick Start Guide

Get the Order Execution Engine running in 5 minutes.

## ⚡ Prerequisites

- Node.js 20+
- Docker & Docker Compose
- ~5 minutes of time

## 🚀 Start in 5 Minutes

### 1. Clone & Install (1 min)

```bash
cd /private/tmp/order-execution-engine
npm install
```

### 2. Start Services (1 min)

```bash
# In a new terminal window
docker-compose up -d

# Verify services started
docker-compose ps
```

### 3. Setup Database (1 min)

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Create .env (1 min)

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 5. Start Server (1 min)

```bash
npm run dev
```

**Server running on http://localhost:3000** ✓

---

## 📝 First Order

### Option A: cURL

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

### Option B: Postman

1. Import `postman/order-execution.postman_collection.json`
2. Change `base_url` to `http://localhost:3000`
3. Click "Submit Market Order"

### Option C: JavaScript

```javascript
const response = await fetch('http://localhost:3000/api/orders/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenIn: 'SOL',
    tokenOut: 'USDC',
    amount: 1.5,
    slippage: 0.01,
  }),
});

const order = await response.json();
console.log('Order ID:', order.orderId);
```

---

## 🔍 Monitor Order Status

```bash
# Get order details
curl http://localhost:3000/api/orders/{orderId}

# List recent orders
curl http://localhost:3000/api/orders

# Queue statistics
curl http://localhost:3000/api/metrics

# Health check
curl http://localhost:3000/health
```

---

## ✅ Verify Setup

Check these endpoints return 200:

```bash
# ✓ Server alive
curl http://localhost:3000/

# ✓ Database connected
curl http://localhost:3000/health

# ✓ Queue running
curl http://localhost:3000/api/metrics
```

---

## 🧪 Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage
```

Expected: **37+ tests passing** ✓

---

## 🐛 Troubleshooting

| Error | Fix |
|-------|-----|
| `Connection refused: 5432` | Run `docker-compose up -d` |
| `Cannot find module` | Run `npm install` |
| `ENOENT: no such file` | Run `npm run prisma:generate` |
| `Bind address already in use` | Change PORT in `.env` |

---

## 🗄️ Database UI

```bash
# Open Prisma Studio
npm run prisma:studio

# Opens interactive database browser at http://localhost:5555
```

---

## 📊 Testing Multiple Orders

```bash
# Create 5 orders quickly
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/orders/execute \
    -H "Content-Type: application/json" \
    -d '{"tokenIn":"SOL","tokenOut":"USDC","amount":'$((RANDOM % 5))'.0,"slippage":0.01}' &
done

# Monitor
watch curl http://localhost:3000/api/metrics
```

---

## 🧹 Cleanup

```bash
# Stop server
# Ctrl+C in terminal

# Stop Docker services
docker-compose down

# Remove database volume (dangerous!)
docker-compose down -v
```

---

## 📚 Next Steps

- Read [README.md](./README.md) for full documentation
- Check [Postman Guide](./postman/README.md) for API examples
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup

---

## 🎯 Project Structure

```
✓ src/          - Source code
✓ tests/        - Unit & integration tests
✓ postman/      - API testing collection
✓ prisma/       - Database schema
✓ docker-compose.yml - Local services
✓ README.md     - Full documentation
```

---

**That's it! You're running the Order Execution Engine.** 🎉

For detailed info, check the [README](./README.md).

