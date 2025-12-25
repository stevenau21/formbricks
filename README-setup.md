# Formbricks Local + Docker Setup (Windows)

This guide sets up Formbricks using Docker with auto-start and adds a desktop shortcut to open the app.

## Prerequisites
- Docker Desktop (with Docker Compose v2)
- Git (optional if you want the source repo locally)

## Quickstart (Docker + Supabase)
A quickstart folder was created at `C:\dev\projects\formbricks-quickstart` with `docker-compose.yml` and generated secrets.
Formbricks uses **Supabase local** for Postgres (with Studio UI at port 54323).

### Start everything
```powershell
# Start Supabase stack first
cd C:\dev\projects\supabase-local
C:\dev\tools\supabase\supabase.exe start

# Then start Formbricks
cd C:\dev\projects\formbricks-quickstart
docker compose up -d
```

### Stop containers
```powershell
cd C:\dev\projects\formbricks-quickstart
docker compose down

# Optionally stop Supabase
cd C:\dev\projects\supabase-local
C:\dev\tools\supabase\supabase.exe stop
```

### Open the apps
- **Formbricks:** Use the "Formbricks" shortcut on your Desktop, or visit http://localhost:3000
- **Supabase Studio:** http://127.0.0.1:54323 (browse database, run SQL queries)
- **Mailpit:** http://127.0.0.1:54324 (test emails)

## Auto-start on boot
Containers use `restart: always` and will start automatically when Docker Desktop starts.
To auto-start Docker Desktop on login:
- Docker Desktop → Settings → General → Enable "Start Docker Desktop when you log in".

**Note:** Supabase CLI must be started manually after boot. Run:
```powershell
cd C:\dev\projects\supabase-local
C:\dev\tools\supabase\supabase.exe start
```

## Optional: Dev stack with MinIO/Redis/Mailhog
From the repo (after clone), you can run the dev compose:
```powershell
cd C:\dev\projects\formbricks
docker compose -f docker-compose.dev.yml up -d
```

## Updating to latest
```powershell
cd C:\dev\projects\formbricks-quickstart
docker compose pull
docker compose down
docker compose up -d
```

## Notes
- Secrets (`NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`) were generated.
- `WEBAPP_URL`/`NEXTAUTH_URL` are set to `http://localhost:3000`.
