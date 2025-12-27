import { prisma } from "@formbricks/database";

async function testQuery() {
  console.log("Testing database connection...\n");

  const count = await prisma.analyticsLog.count();
  console.log(`Total analytics logs: ${count}`);

  const recent = await prisma.analyticsLog.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  console.log("\nRecent logs:");
  recent.forEach((log) => {
    console.log(`- ${log.event} (${log.createdAt})`);
  });
}

testQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
