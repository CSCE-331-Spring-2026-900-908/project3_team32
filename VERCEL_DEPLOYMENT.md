# Vercel Monorepo Deployment Guide

This project deploys both frontend and backend as a single Vercel project.

## Architecture

- **Frontend**: Served as static files from `/`
- **Backend API**: Served from `/api/*` and `/health`
- **Single Domain**: Everything runs on one URL (e.g., `https://sharetea-pos.vercel.app`)

## Quick Deployment

### Option 1: Vercel Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect the `vercel.json` configuration

3. **Configure Build Settings**
   - Framework Preset: **Other**
   - Root Directory: **/** (leave as root)
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install --prefix frontend && npm install --prefix backend`

4. **Add Environment Variables**
   
   Add these in the Vercel dashboard under "Environment Variables":
   
   ```
   DB_HOST = csce-315-db.engr.tamu.edu
   DB_USER = team_32
   DB_PASSWORD = [your_database_password]
   DB_NAME = team_32_db
   DB_PORT = 5432
   NODE_ENV = production
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at: `https://your-project-name.vercel.app`

### Option 2: Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Follow prompts:
   - Set up and deploy? **Yes**
   - Which scope? **[Your account]**
   - Link to existing project? **No**
   - Project name? **sharetea-pos**
   - Directory? **./** (root)
   - Override settings? **No**

4. **Add Environment Variables**
   
   Go to your project in Vercel dashboard and add the environment variables listed above.

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Testing Your Deployment

Once deployed, test these endpoints:

1. **Health Check** (Backend)
   ```bash
   curl https://your-project.vercel.app/health
   ```
   
   Expected response:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "timestamp": "..."
   }
   ```

2. **API Endpoint** (Backend)
   ```bash
   curl https://your-project.vercel.app/api/menu/items
   ```

3. **Frontend** (Open in browser)
   ```
   https://your-project.vercel.app
   ```

## Project Structure

```
project-root/
├── vercel.json              # Vercel configuration (routes both frontend & backend)
├── frontend/
│   ├── package.json
│   ├── .env                 # Local development (localhost:5001)
│   ├── .env.production      # Production (relative /api path)
│   └── dist/                # Built frontend files
└── backend/
    ├── package.json
    └── src/
        └── server.js        # Express API (exported for Vercel)
```

## How It Works

1. **Frontend Build**: Vite builds static files to `frontend/dist/`
2. **Backend Serverless**: Express app runs as Vercel serverless function
3. **Routing**:
   - `/api/*` → Backend API
   - `/health` → Backend health check
   - `/*` → Frontend static files

## Automatic Deployments

Once connected to GitHub:
- Every push to `main` branch triggers a production deployment
- Pull requests get preview deployments
- Rollback to previous deployments anytime

## Environment Variables

### Required for Backend:
- `DB_HOST` - Database host
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `DB_PORT` - Database port (5432)
- `NODE_ENV` - Set to "production"

### Frontend automatically uses:
- `VITE_API_URL=/api` (from `.env.production`)

## Troubleshooting

### View Logs
```bash
vercel logs
```

### Redeploy
```bash
vercel --prod
```

### Check Build Logs
Go to Vercel dashboard → Your project → Deployments → Click on deployment → View logs

### Common Issues

1. **Build fails**: Check that both `frontend/package.json` and `backend/package.json` exist
2. **API not working**: Verify environment variables are set in Vercel dashboard
3. **Database connection fails**: Check database credentials and that TAMU VPN is not required

## Local Development

Frontend:
```bash
cd frontend
npm run dev
```

Backend:
```bash
cd backend
npm run dev
```

Frontend will proxy API requests to `localhost:5001` (configured in `vite.config.js`)

## Custom Domain (Optional)

1. Go to Vercel dashboard → Your project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel automatically provisions SSL certificate

## Done! 🎉

Your full-stack app is now deployed on a single Vercel project with:
- ✅ Frontend at root path
- ✅ Backend API at /api
- ✅ Automatic HTTPS
- ✅ Auto-deploy on git push
- ✅ Preview deployments for PRs
