# Analytics Storage Setup Guide

## Quick Test (5 minutes)

### 1. Test Database Connection
First, verify the AnalyticsLog table exists:

```bash
docker exec -it formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT COUNT(*) FROM analytics_logs;"
```

Expected output: `0` (empty table)

### 2. Test Direct Insert (Simulate n8n)
Insert a test record directly into the database:

```bash
docker exec -it formbricks-postgres-1 psql -U postgres -d formbricks -c "INSERT INTO analytics_logs (id, event, payload) VALUES (gen_random_uuid(), 'test_event', '{\"source\": \"manual_test\", \"data\": {\"value\": 123}}');"
```

Verify it was inserted:

```bash
docker exec -it formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT * FROM analytics_logs;"
```

### 3. Test the MCP Server
From the project root:

```bash
cd apps/mcp-server
pnpm dev
```

In a new terminal, test the MCP server:

```bash
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | pnpm --filter @formbricks/mcp-server run start
```

Test searching logs:

```bash
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "search_analytics_logs", "arguments": {"limit": 5}}, "id": 2}' | pnpm --filter @formbricks/mcp-server run start
```

---

## n8n Setup (Production Flow)

### Step 1: Open Your n8n Workflow
Go to https://n8n.nhax.app and open the workflow that receives Formbricks webhooks.

### Step 2: Add Postgres Node
After the Webhook node:

1. Click **+** to add a new node
2. Search for **Postgres**
3. Select **Postgres** from the list

### Step 3: Configure Postgres Connection
**First time only:**
1. Click **Credential to connect with**
2. Click **Create New Credential**
3. Fill in:
   - **Name**: Formbricks DB
   - **Host**: localhost (or your Docker host IP)
   - **Port**: 5432
   - **Database**: formbricks
   - **User**: postgres
   - **Password**: postgres
   - **SSL**: Disabled (if local)
4. Click **Save**

### Step 4: Configure Insert Operation
In the Postgres node:

1. **Operation**: Insert
2. **Schema**: public
3. **Table**: analytics_logs
4. **Columns**: Add these mappings:
   - **event** → `{{ $json.event }}` (or hardcode like "responseFinished")
   - **payload** → `{{ JSON.stringify($json) }}`
   - **status** → `success` (or leave empty for default)

### Step 5: Test the Workflow
1. Click **Test workflow** in n8n
2. Trigger a webhook from Formbricks (submit a survey response)
3. Check if the Postgres node executed successfully

### Step 6: Verify Data
Run this query:

```bash
docker exec -it formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT id, event, created_at FROM analytics_logs ORDER BY created_at DESC LIMIT 5;"
```

---

## MCP Server Integration with Claude Desktop

### Step 1: Configure Claude Desktop
Edit your Claude config file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this to the `mcpServers` section:

```json
{
  "mcpServers": {
    "formbricks-analytics": {
      "command": "pnpm",
      "args": [
        "--filter",
        "@formbricks/mcp-server",
        "run",
        "start"
      ],
      "cwd": "C:\\dev\\projects\\formbricks",
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/formbricks?schema=public"
      }
    }
  }
}
```

### Step 2: Restart Claude Desktop
Close and reopen Claude Desktop.

### Step 3: Test in Claude
In a new conversation with Claude, type:

"Use the search_analytics_logs tool to show me the latest webhook events"

Claude should be able to query your analytics_logs table.

---

## Advanced: Query Specific Fields

### Example n8n Expression for Filtering
If you want to store only response data:

```javascript
{{
  {
    "surveyId": $json.data.surveyId,
    "responseId": $json.data.response?.id,
    "finished": $json.data.response?.finished,
    "answers": $json.data.response?.data,
    "personId": $json.data.response?.personId
  }
}}
```

### Example MCP Tool Enhancement
To add filtered searching, modify `apps/mcp-server/src/index.ts` and add query by surveyId, responseId, etc.

---

## Troubleshooting

### Database not found
Ensure Formbricks database is running:
```bash
docker ps | grep postgres
```

### MCP server can't connect
Check DATABASE_URL environment variable:
```bash
pnpm --filter @formbricks/mcp-server run start
# Should see "Formbricks Analytics MCP Server running on stdio"
```

### n8n can't reach database
If Formbricks is in Docker but n8n is external, use your machine's IP instead of `localhost`.

### No data appearing
1. Check n8n execution logs
2. Verify the Postgres node shows success
3. Query the table directly to confirm

---

## What You've Built

You now have:
1. **Analytics storage**: Raw webhook payloads stored in `analytics_logs` table
2. **Data pipeline**: n8n → Postgres (preserves full context)
3. **AI access**: MCP server exposes data to agents for analysis
4. **Flexibility**: Can query by event type, date range, or full-text search on JSON payload
