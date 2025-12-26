# Formbricks Cloud Deployment Guide (Railway)

This guide outlines the steps to move your Formbricks instance from a **Local Laptop + Tunnel** setup to a **Professional Cloud Hosting** environment on Railway.

## 🌟 Why Railway?
*   **Always On**: Your laptop can be closed; the forms stay live.
*   **Mobile Friendly**: Provides a high-grade SSL (HTTPS) certificate that fixes "white screen" issues on mobile browsers.
*   **Auto-Scaling**: Handles traffic spikes easily.
*   **All-in-One**: App, Database (Postgres), and Cache (Redis) are in one dashboard.

---

## 🛠️ Deployment Method 1: The One-Click Template (Easiest)
This is recommended for most users starting commercially.

1.  **Create Account**: Sign up at [Railway.app](https://railway.app).
2.  **New Project**: Click **"New Project"** -> **"Deploy from Template"**.
3.  **Search**: Search for **"Formbricks"**.
4.  **Configure**: Railway will ask for a few settings:
    *   `WEBAPP_URL`: Enter your domain (e.g., `https://surveys.nhax.app`).
    *   `NEXTAUTH_SECRET`: Click "Generate" or use your existing one.
    *   `ENCRYPTION_KEY`: Click "Generate" or use your existing one.
5.  **Deploy**: Click **"Deploy"**. Railway will spin up 3 services: **App**, **Postgres**, and **Redis**.

---

## 🏗️ Deployment Method 2: GitHub (Custom Code)
Use this if you have made custom changes to the code that you want to keep.

1.  **GitHub Push**: Create a repository on GitHub and push your local code:
    ```bash
    git remote add origin your_repo_url
    git push -u origin main
    ```
2.  **Railway Connection**: Click **"New Project"** -> **"GitHub Repo"** and select your Formbricks repo.
3.  **Variables**: Go to the **Variables** tab in Railway and add the keys from your `.env` file manually.
4.  **Docker Support**: Railway will see your `Dockerfile` and `docker-compose.yml` and build the container automatically.

---

## 🔑 Key Environment Variables
These are the most important settings for your cloud "Identity":

| Variable | Local Value | Cloud (Railway) Value |
| :--- | :--- | :--- |
| `WEBAPP_URL` | `http://localhost:3000` | `https://your-domain.com` |
| `DATABASE_URL` | `postgresql://...localhost...` | `${{Postgres.DATABASE_URL}}` (Automatic) |
| `REDIS_URL` | `redis://localhost:6379` | `${{Redis.REDIS_URL}}` (Automatic) |

---

## 📦 Data Migration (Moving your surveys)
If you have surveys on your laptop that you want to move to the cloud:

1.  **Export Local**:
    ```powershell
    docker exec -t formbricks-db pg_dumpall -c -U postgres > dump.sql
    ```
2.  **Import to Railway**:
    Use the Railway CLI or a tool like **DBeaver** to connect to your Railway Postgres and run the `dump.sql` script.

---

## 🏁 Final Checklist for Launch
*   [ ] **Custom Domain**: Connect your domain (like `nhax.app`) in the Railway settings.
*   [ ] **DNS Update**: Update your DNS provider (e.g., GoDaddy, Cloudflare) with the CNAME record provided by Railway.
*   [ ] **SMTP (Optional)**: If you want to send email invites, add `SMTP_HOST`, `SMTP_USER`, etc., to the Variables tab.
*   [ ] **Verification**: Open the link on an **iPhone** and an **Android** phone. (The white screen should be 100% gone!)
