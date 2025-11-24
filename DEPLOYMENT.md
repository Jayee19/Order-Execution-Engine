# Deployment Guide

This guide covers deploying the Order Execution Engine to production.

## Prerequisites

- Git repository initialized and pushed to GitHub
- Docker Hub account (optional, for container registry)
- Free hosting account (Railway, Render, or Vercel)

## Option 1: Railway (Recommended)

Railway has excellent free tier support and one-click PostgreSQL/Redis.

### Steps

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize project**
   ```bash
   railway init
   # Select your GitHub repo
   ```

4. **Add services**
   ```bash
   railway add postgresql
   railway add redis
   ```

5. **Configure environment**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set QUEUE_CONCURRENCY=10
   railway variables set MAX_RETRIES=3
   ```

6. **Deploy**
   ```bash
   railway up
   ```

7. **View logs**
   ```bash
   railway logs
   ```

### Getting Public URL

```bash
railway status
```

Your public URL will be displayed. Share this in your README.

---

## Option 2: Render

Render has a generous free tier (but limits to 15-minute sessions).

### Steps

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Go to [render.com](https://render.com)**

3. **New Web Service**
   - Connect GitHub repo
   - Select `order-execution-engine` repository
   - Auto-fill name (or enter custom)

4. **Configure**
   ```
   Build Command: npm install && npm run prisma:generate && npm run build
   Start Command: npm start
   ```

5. **Add Environment**
   ```
   NODE_ENV=production
   QUEUE_CONCURRENCY=10
   MAX_RETRIES=3
   ```

6. **Add Database**
   - Click "Create PostgreSQL"
   - Default name is fine
   - Region: pick closest to you

7. **Add Redis**
   - Click "Create Redis"
   - Default name is fine

8. **Deploy**
   - Database URL auto-fills as `DATABASE_URL`
   - Redis URL auto-fills as `REDIS_URL`
   - Deploy button appears

9. **Monitor**
   - View logs in Render dashboard
   - Check health at `https://your-app.onrender.com/health`

---

## Option 3: Vercel + Serverless (Advanced)

Vercel doesn't directly support long-running processes. You'd need:
- Serverless functions for API
- Separate worker service (not recommended for queued processing)

**Not recommended for this project** - use Railway or Render instead.

---

## GitHub Setup

### Create `.env.production`

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
QUEUE_CONCURRENCY=10
MAX_RETRIES=3
```

**Important:** Don't commit `.env.production`. Add to `.gitignore`.

### Create GitHub Secrets (for CI/CD)

If using GitHub Actions:

1. Go to Settings → Secrets
2. Add:
   ```
   DATABASE_URL_TEST=postgresql://user:pass@localhost/test
   REDIS_URL_TEST=redis://localhost:6379
   ```

### GitHub Actions Workflow

The `.github/workflows/test.yml` automatically runs tests on:
- Push to `main` or `develop`
- Pull requests

Tests include:
- ✓ Linting
- ✓ TypeScript compilation
- ✓ All unit tests
- ✓ All integration tests
- ✓ Coverage report

---

## Docker Deployment

### Build Image

```bash
docker build -t order-execution-engine .
```

### Run Container

```bash
docker run \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -p 3000:3000 \
  order-execution-engine
```

### Push to Docker Hub

```bash
docker tag order-execution-engine yourname/order-execution-engine
docker push yourname/order-execution-engine
```

---

## Post-Deployment Checklist

- [ ] Server running and healthy (`GET /health` returns 200)
- [ ] Database migrations completed
- [ ] Redis connected
- [ ] Can create orders (`POST /api/orders/execute`)
- [ ] WebSocket working (test via Postman or wscat)
- [ ] Logs accessible and clean (no errors)
- [ ] Environment variables set correctly
- [ ] HTTPS/WSS enabled
- [ ] Monitoring/alerts configured

---

## Monitoring

### Health Check

```bash
curl https://your-app-url/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "queue": {
    "active": 0,
    "pending": 0,
    "completed": 100,
    "failed": 0,
    "concurrency": 10
  }
}
```

### Queue Metrics

```bash
curl https://your-app-url/api/metrics
```

Monitor:
- Active orders (should be ≤ 10)
- Pending orders (should decrease over time)
- Completed orders (should increase)
- Failed orders (should be minimal)

---

## Troubleshooting

### Database Connection Error

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Fix:**
- Railway: Check PostgreSQL service is running
- Render: Wait for database initialization (can take 5 mins)
- Verify `DATABASE_URL` environment variable

### Redis Connection Error

**Error:** `connect ECONNREFUSED 127.0.0.1:6379`

**Fix:**
- Railway: Recreate Redis service
- Render: Check Redis is added
- Verify `REDIS_URL` environment variable

### Server Won't Start

**Error:** `Server failed to start`

**Fix:**
1. Check all environment variables set
2. Verify migrations ran: `npm run prisma:migrate`
3. Check logs for specific errors
4. Manually run: `npm run build && npm start`

### WebSocket Not Working

**Error:** Connection dropped/no updates

**Fix:**
- Check WebSocket endpoint: `wss://` (not `ws://`)
- Verify firewall allows WebSocket
- Try alternative client (wscat, Socket.io)

---

## Scaling

### Increase Concurrent Orders

Edit environment variable:
```
QUEUE_CONCURRENCY=20  # From 10 to 20
```

Monitor memory usage - each order takes ~50MB during processing.

### Load Testing

Test with 100 orders/minute:

```bash
for i in {1..100}; do
  curl -X POST https://your-app-url/api/orders/execute \
    -H "Content-Type: application/json" \
    -d '{"tokenIn":"SOL","tokenOut":"USDC","amount":1,"slippage":0.01}' &
done
```

Monitor `/api/metrics` - queue should handle gracefully.

---

## Production Best Practices

1. **Enable HTTPS/WSS** - Required for security
2. **Set up monitoring** - Use Railway/Render built-in monitoring
3. **Configure alerts** - Alert on failures or high queue depth
4. **Backup database** - Set up automated backups
5. **Log rotation** - Keep logs manageable
6. **Rate limiting** - Add middleware to prevent abuse
7. **Authentication** - Add JWT for production
8. **Error tracking** - Integrate Sentry or similar

---

## Rollback

If deployment breaks:

### Railway
```bash
railway rollback
```

### Render
- Revert to previous deploy from dashboard
- Or push fix to GitHub and redeploy

---

## Support

- 🐛 [GitHub Issues](https://github.com/Jayee19/order-execution-engine/issues)
- 📚 [Railway Docs](https://docs.railway.app)
- 📚 [Render Docs](https://render.com/docs)


