#!/usr/bin/env node

/**
 * Quick test script to verify analytics storage setup
 * Run: node test-analytics.js
 */

const { prisma } = require("@formbricks/database");

async function main() {
  console.log("🧪 Testing Analytics Storage Setup...\n");

  // Test 1: Create a sample log
  console.log("1️⃣ Creating sample analytics log...");
  const log = await prisma.analyticsLog.create({
    data: {
      event: "test_response_finished",
      payload: {
        source: "test_script",
        surveyId: "test-survey-123",
        response: {
          id: "resp-456",
          finished: true,
          data: {
            q1: "Yes",
            q2: "5 stars",
          },
        },
        timestamp: new Date().toISOString(),
      },
      status: "success",
    },
  });
  console.log(`✅ Created log with ID: ${log.id}\n`);

  // Test 2: Query logs
  console.log("2️⃣ Querying all logs...");
  const allLogs = await prisma.analyticsLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(`✅ Found ${allLogs.length} log(s)`);
  allLogs.forEach((l, i) => {
    console.log(`   ${i + 1}. Event: ${l.event}, Created: ${l.createdAt}`);
  });
  console.log();

  // Test 3: Search by event type
  console.log("3️⃣ Searching for test events...");
  const testLogs = await prisma.analyticsLog.findMany({
    where: {
      event: {
        contains: "test",
      },
    },
  });
  console.log(`✅ Found ${testLogs.length} test event(s)\n`);

  // Test 4: Show sample payload
  if (allLogs.length > 0) {
    console.log("4️⃣ Sample payload structure:");
    console.log(JSON.stringify(allLogs[0].payload, null, 2));
  }

  console.log("\n✨ All tests passed! Analytics storage is working.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
