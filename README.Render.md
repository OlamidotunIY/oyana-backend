# Deploying to Render.com

Use one Dockerfile: `./Dockerfile`.

## Setup

1. Create 2 services in Render:
   - API web service (`oyana-backend`)
   - Worker service (`oyana-worker`)
2. Connect your GitHub repository.
3. Set for both services:
   - Environment: Docker
   - Dockerfile Path: `./Dockerfile`
   - Docker Build Context: `./`
4. Set start command per service:
   - API: `node dist/src/main.js`
   - Worker: `node dist/src/worker.js`

## Environment Variables

Use the same core variables for both services:

```
DATABASE_URL=your-postgres-connection-string
DIRECT_URL=your-postgres-direct-connection-string
NODE_ENV=production
REDIS_HOST=your-redis-host
REDIS_PORT=6379
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_KEY_FILENAME=/etc/secrets/gcp-service-account.json
PREMBLY_KYC_BUCKET=your-kyc-bucket
DISPATCH_RECONCILE_INTERVAL_SECONDS=120
DISPATCH_WORKER_BATCH_SIZE=100
PREMBLY_RAW_PAYLOAD_CLEANUP_ENABLED=true
PREMBLY_RAW_PAYLOAD_CLEANUP_INTERVAL_MINUTES=360
```

API-only additions:

```
PORT=3500
CORS_ORIGIN=https://your-frontend-domain.com
```

## Notes

- Health check path (API): `/health` or `/graphql`
- Apply migrations before/at deploy using `npx prisma migrate deploy`.
