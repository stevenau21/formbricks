# 🚀 Quick Start Guide - Testing Analytics Storage

## ✅ Step 1: Verify Database (30 seconds)

Open PowerShell in the project root and run:

```powershell
# Check if the analytics_logs table exists
docker exec -it formbricks-postgres-1 psql -U postgres -d formbricks -c "\dt analytics_logs"

# Should show the table schema
```

## ✅ Step 2: Test with Sample Data (1 minute)

```powershell
# Set the database URL
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/formbricks?schema=public'

# Run the test script
cd apps\mcp-server
node test-analytics.js
```

**Expected output:**
```
✅ Created log with ID: <uuid>
✅ Found 1 log(s)
✅ All tests passed!
```

## ✅ Step 3: Test MCP Server (1 minute)

In the same terminal:

```powershell
# Start the MCP server (in background)
cd C:\dev\projects\formbricks
Start-Process powershell -ArgumentList "-NoExit", "-Command", "pnpm --filter @formbricks/mcp-server run dev"
```

Test it in your current terminal:

```powershell
# List available tools
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | pnpm --filter @formbricks/mcp-server run start

# Search logs
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "search_analytics_logs", "arguments": {"limit": 5}}, "id": 2}' | pnpm --filter @formbricks/mcp-server run start
```

## ✅ Step 4: Configure n8n (5 minutes)

### 4a. Go to your n8n instance
Open https://n8n.nhax.app in your browser

### 4b. Import the workflow
1. Click **Workflows** → **Add workflow** → **Import from File**
2. Select: `C:\dev\projects\formbricks\n8n-workflow-template.json`
3. Click **Import**

### 4c. Configure Postgres credentials
1. Click on the **Postgres** node
2. Click **Credential to connect with** → **Create New Credential**
3. Fill in:
   - **Name**: `Formbricks DB`
   - **Host**: `localhost` (or your Docker host IP if n8n is not on the same machine)
   - **Port**: `5432`
   - **Database**: `formbricks`
   - **User**: `postgres`
   - **Password**: `postgres`
   - **SSL Mode**: `disable`
4. Click **Test** (should show ✅ Connection successful)
5. Click **Save**

### 4d. Get the webhook URL
1. Click on the **Webhook** node
2. Copy the **Production URL** (e.g., `https://n8n.nhax.app/webhook/formbricks-webhook`)
3. Save the workflow

### 4e. Activate the workflow
1. Toggle the switch at the top right to **Active**

## ✅ Step 5: Configure Formbricks to Send Webhooks (2 minutes)

### Option A: Via Formbricks UI
1. Go to http://localhost:3000
2. Navigate to **Settings** → **Integrations** → **Webhooks**
3. Click **Add Webhook**
4. Fill in:
   - **Name**: `Analytics Logger`
   - **Webhook URL**: `<your n8n webhook URL from step 4d>`
   - **Triggers**: Select `Response Created`, `Response Updated`, `Response Finished`
   - **Surveys**: Leave empty to log all surveys
5. Click **Save**

### Option B: Direct Database Insert (Quick Test)
```powershell
docker exec -it formbricks-postgres-1 psql -U postgres -d formbricks -c "
INSERT INTO \"Webhook\" (id, url, source, \"environmentId\", triggers, \"surveyIds\", \"createdAt\", \"updatedAt\")
SELECT
  gen_random_uuid(),
  'https://n8n.nhax.app/webhook/formbricks-webhook',
  'n8n',
  id,
  ARRAY['responseFinished']::\"PipelineTriggers\"[],
  ARRAY[]::text[],
  NOW(),
  NOW()
FROM \"Environment\"
LIMIT 1;
"
```

## ✅ Step 6: Test End-to-End (3 minutes)

### 6a. Submit a test survey response
1. Go to your Formbricks instance: http://localhost:3000
2. Create or open a survey
3. Get the preview link
4. Submit a test response

### 6b. Check n8n execution
1. Go back to n8n
2. Click **Executions** in the left sidebar
3. You should see a new successful execution
4. Click on it to see the details

### 6c. Verify data in database
```powershell
docker exec -it formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT id, event, created_at, payload->>'source' as source FROM analytics_logs ORDER BY created_at DESC LIMIT 3;"
```

### 6d. Query via MCP Server
```powershell
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "search_analytics_logs", "arguments": {"limit": 5}}, "id": 3}' | pnpm --filter @formbricks/mcp-server run start
```

---

## 🎯 What Each Component Does

```
Survey Response Submitted
         ↓
Formbricks Internal Pipeline (/api/(internal)/pipeline)
         ↓
Sends webhook to n8n (configured URL)
         ↓
n8n receives webhook
         ↓
n8n inserts data into analytics_logs table
         ↓
Data available for:
   - MCP server queries (AI agents)
   - Direct SQL analysis
   - Future analytics dashboards
```

---

## 🔍 Useful Queries

### Count events by type
```sql
SELECT event, COUNT(*) 
FROM analytics_logs 
GROUP BY event 
ORDER BY COUNT(*) DESC;
```

### Get recent responses
```sql
SELECT 
  id,
  event,
  created_at,
  payload->>'surveyId' as survey_id,
  payload->'response'->>'id' as response_id
FROM analytics_logs
WHERE event LIKE '%response%'
ORDER BY created_at DESC
LIMIT 10;
```

### Search for specific survey
```sql
SELECT * 
FROM analytics_logs 
WHERE payload @> '{"data": {"surveyId": "your-survey-id"}}'::jsonb
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### "Table analytics_logs does not exist"
```powershell
cd C:\dev\projects\formbricks
pnpm --filter @formbricks/database exec prisma migrate deploy
```

### n8n can't connect to database
- If Formbricks is in Docker and n8n is external, use your machine's IP instead of `localhost`
- Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

### MCP server shows "Cannot find module"
```powershell
pnpm --filter @formbricks/database build
pnpm install
```

### No webhooks being sent
1. Check Formbricks logs: `docker logs formbricks-formbricks-1 --tail 50`
2. Verify webhook is configured: `docker exec -it formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT * FROM \"Webhook\";"`

---

## 📊 Next Steps

1. **Add more MCP tools** - Edit `apps/mcp-server/src/index.ts` to add tools for:
   - Aggregate statistics
   - Response completion rates
   - Survey performance metrics

2. **Set up retention policies** - Add a cron job to delete old logs:
   ```sql
   DELETE FROM analytics_logs WHERE created_at < NOW() - INTERVAL '90 days';
   ```

3. **Build dashboards** - Connect to analytics_logs from:
   - Metabase
   - Grafana
   - Custom Next.js dashboard

4. **Enhanced search** - Add GIN index on payload for faster JSON queries:
   ```sql
   CREATE INDEX idx_analytics_payload ON analytics_logs USING GIN (payload);
   ```
