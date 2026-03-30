# Simple Vercel Deployment - Two Separate Projects

Deploy frontend and backend as separate Vercel projects (much simpler!)

## Step 1: Deploy Backend First

### Via Vercel Dashboard:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - **Project Name**: `sharetea-backend` (or your choice)
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

5. Add Environment Variables:
   ```
   DB_HOST = csce-315-db.engr.tamu.edu
   DB_USER = team_32
   DB_PASSWORD = [your_password]
   DB_NAME = team_32_db
   DB_PORT = 5432
   NODE_ENV = production
   ```

6. Click "Deploy"

7. **Copy your backend URL** (e.g., `https://sharetea-backend.vercel.app`)

### Via CLI:

```bash
cd backend
vercel
# Follow prompts, select backend as root directory
vercel --prod
```

## Step 2: Deploy Frontend

### Via Vercel Dashboard:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import the SAME GitHub repository again
4. Configure:
   - **Project Name**: `sharetea-frontend` (or your choice)
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variable:
   ```
   VITE_API_URL = https://your-backend-url.vercel.app/api
   ```
   (Use the backend URL from Step 1)

6. Click "Deploy"

### Via CLI:

```bash
cd frontend
vercel
# Follow prompts, select frontend as root directory
vercel --prod
```

## Step 3: Test

1. **Test Backend**:
   ```bash
   curl https://your-backend.vercel.app/health
   ```

2. **Test API**:
   ```bash
   curl https://your-backend.vercel.app/api/menu/items
   ```

3. **Open Frontend**:
   ```
   https://your-frontend.vercel.app
   ```

## Result

You'll have two separate URLs:
- Backend: `https://sharetea-backend.vercel.app`
- Frontend: `https://sharetea-frontend.vercel.app`

Both will auto-deploy when you push to GitHub!

## CORS Note

Since frontend and backend are on different domains, CORS is already configured in your backend (`cors()` middleware in `server.js`), so everything will work fine.

## Updating Backend URL

If you need to change the backend URL later:
1. Go to Vercel Dashboard → Frontend Project → Settings → Environment Variables
2. Update `VITE_API_URL`
3. Redeploy frontend
