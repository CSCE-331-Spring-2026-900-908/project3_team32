# Deployment Checklist - Single Vercel Project

## Prerequisites
- GitHub account with your code pushed
- Vercel account (sign up at vercel.com)

## Quick Deploy Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Vercel

**Via Dashboard** (Easiest):
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - Framework: **Other**
   - Root Directory: **/** (leave as root)
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install --prefix frontend && npm install --prefix backend`

**Via CLI** (Faster):
```bash
npm install -g vercel
vercel login
vercel
```

### 3. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
DB_HOST = csce-315-db.engr.tamu.edu
DB_USER = team_32
DB_PASSWORD = [your_password]
DB_NAME = team_32_db
DB_PORT = 5432
NODE_ENV = production
```

### 4. Deploy to Production
```bash
vercel --prod
```

## Verification

Your app is live at: `https://your-project-name.vercel.app`

Test endpoints:
- Frontend: `https://your-project-name.vercel.app`
- API Health: `https://your-project-name.vercel.app/health`
- API Menu: `https://your-project-name.vercel.app/api/menu/items`

## Done! 🎉

Both frontend and backend are deployed on the same domain:
- Frontend: `/`
- Backend API: `/api/*`
- Health Check: `/health`

See `VERCEL_DEPLOYMENT.md` for detailed documentation.
