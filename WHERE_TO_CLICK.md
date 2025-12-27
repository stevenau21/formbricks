# 🎯 EXACT STEPS - Where to Click in Formbricks UI

## Step-by-Step Visual Guide

### 1. Access Formbricks
- Open your browser
- Go to: **http://localhost:3000**
- Log in with your credentials

---

### 2. Navigate to Webhook Settings

**Click Path:**
1. Look at the **left sidebar**
2. Scroll down to find **"Settings"** (gear icon ⚙️)
3. Click **Settings**
4. In the settings page, look for tabs at the top
5. Click the **"Integrations"** or **"Webhooks"** tab

**Alternative path if no Webhooks tab visible:**
1. Go to your **Project Settings**
2. Click **"Integrations"**
3. Scroll down to **"Webhooks"** section

---

### 3. Add New Webhook

You should see a page with existing webhooks (if any) and a button:

**Click:** "**+ Add Webhook**" or "**Create Webhook**" button

---

### 4. Fill in Webhook Details

A form will appear. Fill it in as follows:

#### Field 1: **Name** (Optional)
```
Analytics Logger
```

#### Field 2: **Webhook URL** ⚠️ IMPORTANT
```
https://n8n.nhax.app/webhook-test/webhook
```
*Replace with your actual n8n webhook URL*

#### Field 3: **Source**
- Select: **n8n** from the dropdown

#### Field 4: **Triggers** (Checkboxes)
Select ALL THREE:
- ✅ **Response Created**
- ✅ **Response Updated**  
- ✅ **Response Finished**

#### Field 5: **Survey Selection** (Optional)
- **Leave empty** to track all surveys
- OR select specific surveys if you only want to log certain ones

---

### 5. Save the Webhook

**Click:** "**Save**" or "**Create Webhook**" button at the bottom

You should see:
- ✅ Success message
- The new webhook appears in your webhooks list

---

## 📋 Quick Test After Setup

### Test 1: Trigger a Webhook Manually

Open a new PowerShell terminal and run:

```powershell
# This simulates what Formbricks sends to n8n
Invoke-RestMethod -Uri "https://n8n.nhax.app/webhook-test/webhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"event":"test","data":{"message":"manual test"}}'
```

### Test 2: Check if It Reached the Database

```powershell
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT event, created_at FROM analytics_logs ORDER BY created_at DESC LIMIT 5;"
```

### Test 3: Submit a Real Survey Response

1. In Formbricks, go to **Surveys**
2. Click on any survey
3. Click **"Preview"** or **"Share"**
4. Submit a test response
5. Run the database check from Test 2 again

---

## 🔧 If You Don't See "Webhooks" in Settings

The webhook feature might be in a different location. Try:

### Method A: Database Direct Insert

Run this command to add a webhook directly to the database:

```powershell
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "INSERT INTO \"Webhook\" (id, url, source, \"environmentId\", triggers, \"surveyIds\", \"createdAt\", \"updatedAt\") SELECT gen_random_uuid(), 'https://n8n.nhax.app/webhook-test/webhook', 'n8n', id, ARRAY['responseFinished']::\"PipelineTriggers\"[], ARRAY[]::text[], NOW(), NOW() FROM \"Environment\" LIMIT 1;"
```

### Method B: Check Existing Webhooks

See what's already configured:

```powershell
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT id, name, url, source, triggers FROM \"Webhook\";"
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Webhook appears in Formbricks UI or database
- [ ] n8n workflow is **Active** (toggle switch on)
- [ ] n8n Postgres node has valid credentials
- [ ] Database table `analytics_logs` exists
- [ ] MCP server can query the data

Run all verification:

```powershell
# 1. Check webhook exists
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT COUNT(*) as webhook_count FROM \"Webhook\";"

# 2. Check table exists and has data
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT COUNT(*) as log_count FROM analytics_logs;"

# 3. Test MCP server
cd C:\dev\projects\formbricks
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | pnpm --filter @formbricks/mcp-server run start
```

---

## 📞 Getting the Exact UI Path

If you can't find the webhooks section, take a screenshot of:
1. The Formbricks settings page
2. The left sidebar menu

The webhook configuration is typically under one of these paths:
- **Settings → Integrations → Webhooks**
- **Project Settings → API & Webhooks**
- **Environment Settings → Webhooks**
- **Integrations → Custom Webhooks**

The exact location depends on your Formbricks version, but the database insert method (Method A above) will always work as a fallback.
