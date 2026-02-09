# Deploying to Render.com

## Option 1: Using Dockerfile.render (Recommended for Render)

### Setup in Render Dashboard

1. **Create a new Web Service**
2. **Connect your GitHub repository**
3. **Configure the service:**
   - **Name**: oyana-backend
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile.render`
   - **Docker Build Context**: `./`

4. **Add Environment Variables:**

   ```
   DATABASE_URL=your-supabase-connection-string
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   CORS_ORIGIN=https://your-frontend-domain.com
   NODE_ENV=production
   PORT=3500
   ```

5. **Health Check Path** (optional): `/health` or `/graphql`

### Deploy

Push your code to GitHub, and Render will automatically build and deploy.

## Option 2: Using the Multi-stage Dockerfile

If you prefer the optimized multi-stage build:

1. In Render dashboard, set **Dockerfile Path** to `./Dockerfile`
2. Same environment variable configuration as above

## Troubleshooting

### Build fails with "Cannot find module '/app/dist/main'"

This means the TypeScript build failed. Check:

1. **Build logs** in Render dashboard - look for TypeScript compilation errors
2. **Test build locally:**
   ```bash
   docker build -f Dockerfile.render -t oyana-backend .
   docker run -p 3500:3500 --env-file .env oyana-backend
   ```

### Database connection issues

Make sure you're using the **correct Supabase connection string** format:

```
# For Prisma with Supabase (use connection pooling)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

### Port issues

Render automatically sets the `PORT` environment variable. To use it:

Update [src/main.ts](src/main.ts):

```typescript
await app.listen(process.env.PORT ?? 3500);
```

## Run Migrations on Render

### Option 1: Add to Dockerfile.render build

```dockerfile
# Before the CMD line, add:
RUN npx prisma migrate deploy
```

### Option 2: Use Render's "Build Command"

In Render dashboard:

- **Build Command**: `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command**: `node dist/main.js`

## Logs

View logs in Render dashboard or via CLI:

```bash
render logs <service-name>
```
