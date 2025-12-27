# Test Suite
Write-Host "Formbricks Analytics Storage - Test Suite
" -ForegroundColor Cyan

# Set environment
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/formbricks?schema=public'

# Test 1: Database
Write-Host "Test 1: Database Connection" -ForegroundColor Yellow
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT COUNT(*) FROM analytics_logs;"
if ($LASTEXITCODE -eq 0) { Write-Host "[OK] Database works
" -ForegroundColor Green }

# Test 2: Insert
Write-Host "Test 2: Insert Sample Data" -ForegroundColor Yellow
cd C:\dev\projects\formbricks\apps\mcp-server
node test-analytics.js

# Test 3: Query
Write-Host "
Test 3: Query Data" -ForegroundColor Yellow
docker exec formbricks-postgres-1 psql -U postgres -d formbricks -c "SELECT event, created_at FROM analytics_logs ORDER BY created_at DESC LIMIT 3;"

# Test 4: MCP Server
Write-Host "
Test 4: MCP Server" -ForegroundColor Yellow
cd C:\dev\projects\formbricks
echo '{\"jsonrpc\": \"2.0\", \"method\": \"tools/list\", \"id\": 1}' | pnpm --filter @formbricks/mcp-server run start 2>1 | Select-String -Pattern "search_analytics"

Write-Host "
[COMPLETE] All tests finished. See QUICK_START.md for next steps.
" -ForegroundColor Green
