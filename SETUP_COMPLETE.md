# ✅ SETUP COMPLETE - What You Have Now

## Your System is Ready!

All tests passed successfully. Here's what's been set up:

### 1. Database Storage ✅
- **Table**: `analytics_logs` in Formbricks PostgreSQL database
- **Location**: `localhost:5432/formbricks`
- **Columns**: `id`, `event`, `payload` (JSON), `status`, `created_at`
- **Test Data**: 2 sample records inserted

### 2. MCP Server ✅
- **Location**: `apps/mcp-server/`
- **Tools Available**:
  - `search_analytics_logs` - Query stored events
  - `log_analytics_event` - Manually log events
- **Status**: Operational and tested

### 3. Test Scripts ✅
- `test-simple.ps1` - Quick verification script
- `apps/mcp-server/test-analytics.js` - Insert and query test
- `apps/mcp-server/test-db.ts` - TypeScript database test

---

## Next: Connect n8n (5 minutes)

### Open n8n
Go to: https://n8n.nhax.app

### Import the Workflow
1. Click **Workflows** → **Import from file**
2. Select: `C:\dev\projects\formbricks\n8n-workflow-template.json`

### Configure Postgres Connection
In the Postgres node:
- **Host**: `localhost` (or your Docker host IP)
- **Port**: `5432`
- **Database**: `formbricks`
- **User**: `postgres`
- **Password**: `postgres`

### Get Your Webhook URL
Copy the webhook URL from n8n (e.g., `https://n8n.nhax.app/webhook/formbricks-webhook`)

### Add to Formbricks

**Option 1 - Via Database (Quickest)**
```powershell
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "INSERT INTO \"Webhook\" (id, url, source, \"environmentId\", triggers, \"surveyIds\", \"createdAt\", \"updatedAt\") SELECT gen_random_uuid(), 'YOUR_N8N_WEBHOOK_URL_HERE', 'n8n', id, ARRAY['responseFinished']::\"PipelineTriggers\"[], ARRAY[]::text[], NOW(), NOW() FROM \"Environment\" LIMIT 1;"
```

Replace `YOUR_N8N_WEBHOOK_URL_HERE` with your actual n8n webhook URL.

**Option 2 - Via Formbricks UI**
See `WHERE_TO_CLICK.md` for detailed UI instructions.

---

## Test End-to-End

### 1. Submit a Survey Response
- Go to http://localhost:3000
- Open any survey
- Submit a test response

### 2. Check n8n Execution
- Go to n8n → Executions
- Should see a successful execution

### 3. Verify in Database
```powershell
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT event, created_at, payload->'data'->>'surveyId' as survey_id FROM analytics_logs ORDER BY created_at DESC LIMIT 5;"
```

### 4. Query via MCP
```powershell
cd C:\dev\projects\formbricks
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "search_analytics_logs", "arguments": {"limit": 5}}, "id": 1}' | pnpm --filter @formbricks/mcp-server run start
```

---

## Use with AI Agents

### Claude Desktop Setup
Edit: `%APPDATA%\Claude\claude_desktop_config.json`

Add:
```json
{
  "mcpServers": {
    "formbricks-analytics": {
      "command": "pnpm",
      "args": ["--filter", "@formbricks/mcp-server", "run", "start"],
      "cwd": "C:\\dev\\projects\\formbricks",
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/formbricks?schema=public"
      }
    }
  }
}
```

Then ask Claude:
> "Use the search_analytics_logs tool to show me recent survey responses"

---

## Data Flow Diagram

```
User Submits Survey
        ↓
Formbricks Backend
        ↓
Internal Pipeline (/api/(internal)/pipeline)
        ↓
Webhook Trigger (configured in Webhook table)
        ↓
n8n Receives POST
        ↓
n8n Postgres Node
        ↓
INSERT INTO analytics_logs
        ↓
Data Available For:
  • MCP Server (AI Agents)
  • Direct SQL Queries
  • Analytics Dashboards
  • Data Export
```

---

## Common Queries

### Count by Event Type
```sql
SELECT event, COUNT(*) 
FROM analytics_logs 
GROUP BY event 
ORDER BY COUNT(*) DESC;
```

### Recent Finished Responses
```sql
SELECT 
  payload->'data'->'response'->>'id' as response_id,
  payload->'data'->>'surveyId' as survey_id,
  created_at
FROM analytics_logs
WHERE event = 'responseFinished'
ORDER BY created_at DESC
LIMIT 10;
```

### Search by Survey ID
```sql
SELECT * 
FROM analytics_logs
WHERE payload @> '{"data": {"surveyId": "YOUR_SURVEY_ID"}}'::jsonb;
```

---

## Files Created

| File | Purpose |
|------|---------|
| `packages/database/schema.prisma` | Added AnalyticsLog model |
| `apps/mcp-server/` | MCP server application |
| `apps/mcp-server/src/index.ts` | MCP server code |
| `apps/mcp-server/test-analytics.js` | Test script |
| `QUICK_START.md` | Complete setup guide |
| `WHERE_TO_CLICK.md` | UI navigation guide |
| `ANALYTICS_SETUP.md` | Detailed documentation |
| `n8n-workflow-template.json` | n8n workflow template |
| `test-simple.ps1` | Automated test script |

---

## Quick Commands Reference

```powershell
# View recent logs
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT event, created_at FROM analytics_logs ORDER BY created_at DESC LIMIT 10;"

# Count total logs
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT COUNT(*) FROM analytics_logs;"

# Start MCP server
cd C:\dev\projects\formbricks\apps\mcp-server
pnpm dev

# Run test suite
C:\dev\projects\formbricks\test-simple.ps1

# Check webhooks
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c 'SELECT id, name, url FROM "Webhook";'
```

---

## Support Files

- **QUICK_START.md** - Full step-by-step guide
- **WHERE_TO_CLICK.md** - Exact UI locations
- **ANALYTICS_SETUP.md** - Technical deep dive

---

**Status**: ✅ ALL SYSTEMS GO

You're ready to start capturing and analyzing Formbricks webhook data with AI agents!
