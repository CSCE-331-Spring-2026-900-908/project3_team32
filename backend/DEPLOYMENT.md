# Backend Deployment Guide - Vercel

## Prerequisites
- Vercel account (sign up at vercel.com)
- Vercel CLI installed: `npm install -g vercel`

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your GitHub repository

3. **Configure the project**
   - Framework Preset: Other
   - Root Directory: `backend`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: `npm install`

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   ```
   DB_HOST=csce-315-db.engr.tamu.edu
   DB_USER=team_32
   DB_PASSWORD=your_password_here
   DB_NAME=team_32_db
   DB_PORT=5432
   NODE_ENV=production
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your API will be live at: `https://your-project-name.vercel.app`

### Option 2: Deploy via CLI

1. **Navigate to backend folder**
   ```bash
   cd backend
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? Yes
   - Which scope? (select your account)
   - Link to existing project? No
   - Project name? (accept default or customize)
   - Directory? ./
   - Override settings? No

4. **Add environment variables**
   ```bash
   vercel env add DB_HOST
   vercel env add DB_USER
   vercel env add DB_PASSWORD
   vercel env add DB_NAME
   vercel env add DB_PORT
   ```

5. **Deploy to production**
   ```bash
   vercel --prod
   ```

## After Deployment

1. **Get your API URL**
   - It will be something like: `https://sharetea-pos-backend.vercel.app`

2. **Update Frontend Environment Variable**
   - Update `frontend/.env`:
     ```
     VITE_API_URL=https://your-backend-url.vercel.app/api
     ```

3. **Test your API**
   ```bash
   curl https://your-backend-url.vercel.app/health
   ```

## Important Notes

- Vercel serverless functions have a 10-second timeout on the free tier
- Database connections are created per request (connection pooling is handled)
- Environment variables are encrypted and secure
- Automatic HTTPS is provided
- Auto-deploys on every git push to main branch

## Troubleshooting

### Check Logs
```bash
vercel logs
```

### Redeploy
```bash
vercel --prod
```

### Remove Deployment
```bash
vercel remove your-project-name
```

## Local Development

To run locally (not in production mode):
```bash
npm run dev
```

The server will start on port 5001 (or PORT from .env)
