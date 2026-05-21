# SmartBill POS — Live Deployment Guide

This guide describes how to deploy the **SmartBill POS** application to live servers: the Node.js/Express API backend to **Render** and the static HTML/CSS/JS frontend to **Vercel**.

---

## Step 1: Push Code to GitHub

Since both Render and Vercel support automatic deployments directly from GitHub, we need to upload your local Git repository first:

1. Go to [github.com](https://github.com) and sign in.
2. Click **New Repository**.
3. Set the repository name to `smartbill-pos` (or any name you prefer) and keep it private or public. **Do NOT select "Initialize this repository with a README, .gitignore, or license"** (since we already have them).
4. Click **Create Repository**.
5. Copy the command under the section **"…or push an existing repository from the command line"**. It will look like this:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/smartbill-pos.git
   git branch -M main
   git push -u origin main
   ```
6. Open your terminal in the project root folder `C:\Users\sarav\Documents\antigravity\New folder\Billing` and run those three commands to push the code to GitHub.

---

## Step 2: Deploy the Backend to Render (render.com)

Render will host your Node.js API and connect it to your MongoDB database.

1. Create a free account at [render.com](https://render.com) and sign in.
2. On the Dashboard, click **New** -> **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub account.
4. Select your `smartbill-pos` repository.
5. Configure the Web Service settings:
   - **Name**: `smartbill-backend`
   - **Region**: Select the region closest to you.
   - **Branch**: `main`
   - **Root Directory**: `backend` *(⚠️ Critical: Render must look inside the backend folder)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click **Advanced** and add the following **Environment Variables**:
   - `MONGO_URI`: Enter your MongoDB Atlas connection string (e.g. `mongodb+srv://admin:<password>@cluster.mongodb.net/smartbill`).
     - *Note: If you want to use the self-contained offline database for testing on Render, you can omit `MONGO_URI` or leave it empty, but a real MongoDB Atlas URI is highly recommended for production.*
   - `JWT_SECRET`: Enter a secure random string (e.g. `some_long_random_secret_key_2026`).
7. Click **Create Web Service**.
8. Once deployment is complete, Render will provide a live URL like `https://smartbill-backend.onrender.com`. Copy this URL.

---

## Step 3: Link the Frontend to the Backend URL

Now we need to update the frontend to point to the live Render backend:

1. Open [frontend/js/app.js](file:///C:/Users/sarav/Documents/antigravity/New%20folder/Billing/frontend/js/app.js) in your text editor.
2. In lines 18-20, replace the placeholder URL with your actual live Render URL:
   ```javascript
   window.API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
     ? 'http://localhost:5000'
     : 'https://smartbill-backend.onrender.com'; // <-- Paste your Render URL here
   ```
3. Commit and push the change to GitHub:
   ```bash
   git commit -am "Update live backend API URL"
   git push
   ```

---

## Step 4: Deploy the Frontend to Vercel (vercel.com)

Vercel will host your static files and deliver them via their global CDN.

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New** -> **Project**.
3. Select the `smartbill-pos` repository from your connected GitHub account and click **Import**.
4. Configure the Project settings:
   - **Framework Preset**: Select **Other** (since it is a vanilla HTML/CSS/JS app).
   - **Root Directory**: Select `frontend` and click **Keep** (do not select root).
   - **Build Command**: Leave blank (no build command is needed).
   - **Output Directory**: Leave blank (defaults to public/root of the folder).
5. Click **Deploy**.
6. Within a few seconds, your application will be live! Vercel will give you a domain name (e.g., `https://smartbill-pos.vercel.app`).
7. Open the Vercel URL, and login with your admin account to verify everything is working perfectly!
