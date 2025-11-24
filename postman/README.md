# Postman Collection - Order Execution Engine

This folder contains the Postman collection for testing the Order Execution Engine API.

## Setup

1. **Import the collection** in Postman:
   - Open Postman
   - Click "Import" → "File"
   - Select `order-execution.postman_collection.json`

2. **Configure the environment**:
   - Set the `base_url` variable:
     - Default: `http://localhost:3000`
     - Change if running on different host/port

## API Endpoints

### Health & Info
- **GET /health** - Health check and queue statistics
- **GET /** - API information and available endpoints
- **GET /api/metrics** - Detailed queue metrics

### Orders
- **POST /api/orders/execute** - Submit a market order
  - Upgrades to WebSocket for real-time status updates
  - Body: `{ tokenIn, tokenOut, amount, slippage }`
  - Response: `{ orderId, status, ... }`

- **GET /api/orders/:orderId** - Get order details and logs
- **GET /api/orders** - List recent orders

## Testing Flow

### 1. Health Check
Start by verifying the server is running:
```
GET http://localhost:3000/health
```

Expected Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "queue": {
    "active": 0,
    "pending": 0,
    "completed": 0,
    "failed": 0,
    "concurrency": 10
  }
}
```

### 2. Submit an Order
Create a new market order:
```
POST http://localhost:3000/api/orders/execute
Content-Type: application/json

{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1.5,
  "slippage": 0.01
}
```

Expected Response:
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1.5
}
```

**Note**: This endpoint upgrades to WebSocket. Use Postman's WebSocket feature or connect with a WebSocket client to receive real-time updates.

### 3. Monitor Order Status
Once an order is submitted, you'll receive WebSocket messages:

```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "timestamp": "2025-01-15T10:30:01.000Z"
}
```

Status progression: `pending` → `routing` → `building` → `submitted` → `confirmed` (or `failed`)

### 4. Retrieve Order Details
Get the full order record:
```
GET http://localhost:3000/api/orders/550e8400-e29b-41d4-a716-446655440000
```

### 5. List Recent Orders
Fetch the last 20 orders:
```
GET http://localhost:3000/api/orders
```

## Concurrent Testing

To test concurrent order processing:

1. Submit multiple orders simultaneously (5-10 in quick succession)
2. Use Postman's **Collection Runner**:
   - Select "Test Scenarios" folder
   - Click "Run"
   - Set iterations to 1
   - Run all 5 test orders

3. Monitor queue metrics:
```
GET http://localhost:3000/api/metrics
```

Expected behavior:
- Queue should handle up to 10 concurrent orders
- Processing time: ~3-5 seconds per order
- Throughput: ~100 orders/minute

## WebSocket Connection

To connect via WebSocket and receive real-time updates:

```javascript
const orderId = 'your-order-id-here';
const ws = new WebSocket(`ws://localhost:3000/api/orders/execute`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Order Update:', message);
};
```

**WebSocket Message Format**:
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "timestamp": "2025-01-15T10:30:01.000Z",
  "executedPrice": 25.5,
  "txHash": "abc123...",
  "error": null
}
```

## Test Scenarios

Five predefined test orders are included:
1. **Order 1** - Standard SOL→USDC swap
2. **Order 2** - Reverse USDC→SOL swap
3. **Order 3** - Large amount (5 SOL)
4. **Order 4** - Low slippage tolerance (0.5%)
5. **Order 5** - High slippage tolerance (5%)

Run them together to test concurrent processing.

## Troubleshooting

### Connection Refused
- Ensure server is running: `npm run dev`
- Check port 3000 is not blocked
- Verify Redis and PostgreSQL are running

### WebSocket Not Upgrading
- Some HTTP clients don't support WebSocket upgrades
- Use a WebSocket client like wscat or Socket.io client
- Or use Postman's native WebSocket testing (Pro)

### Orders Failing
- Check server logs for error messages
- Verify database connection: `npm run prisma:studio`
- Check queue status: `GET /api/metrics`

## Performance Testing

For 100 orders/minute throughput test:
- Concurrency: 10 orders
- Processing time per order: ~3.5 seconds
- Total time for 100 orders: ~35 seconds
- Use Collection Runner with 10 iterations of 10 requests

Expected results:
- All orders should complete within 6 seconds
- Queue should not drop any orders
- WebSocket updates should arrive in real-time

