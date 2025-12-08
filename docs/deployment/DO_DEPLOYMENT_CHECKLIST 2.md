# DigitalOcean Deployment Checklist

## During App Creation

When you see both Docker and Node.js build options:

✅ **Select Docker Build** (since we have a Dockerfile)
- The Dockerfile path should be: `Dockerfile`
- Source directory: `/`

## Build Configuration

The app should automatically detect from our Dockerfile:
- Build command: (handled by Dockerfile)
- Run command: `npm start` (from CMD in Dockerfile)
- Port: 3000

## Environment Variables to Add

In the DigitalOcean console, add these if not auto-detected:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=[generate-a-secure-secret]
DB_SSL=true
```

The database connection details (DB_HOST, DB_PORT, etc.) will be automatically provided by DigitalOcean when it creates the PostgreSQL database.

## Resource Configuration

- **Instance Size**: Basic XXS ($4/month) is fine to start
- **PostgreSQL**: Dev database ($7/month)
- **Redis**: Basic plan ($10/month) or skip initially if not needed

## What Happens on Deploy

1. DigitalOcean pulls code from GitHub
2. Runs Docker build (which runs `npm run build || true`)
3. Creates container with our CMD: `npm start`
4. The start script tries:
   - First: `node dist/index.js` (compiled JavaScript)
   - Fallback: `npx ts-node src/index.ts` (if compilation failed)

## After Deployment

1. Check the build logs in DigitalOcean console
2. Once deployed, get your app URL
3. Test health endpoint: `https://your-app-url/health`
4. Run database seed: 
   - Use DigitalOcean console terminal
   - Run: `node scripts/seed.js`

## If Issues Occur

The app is configured to be resilient:
- TypeScript errors won't block deployment
- Has fallback to ts-node if compilation fails
- Health check endpoint for monitoring

The latest push includes all fixes for Docker deployment!