import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";
import { z } from "zod";

// prisma will be loaded after ensuring DATABASE_URL is set
let prismaClient: any;

const server = new Server(
  {
    name: "formbricks-analytics",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_analytics_logs",
        description: "Search through stored webhook analytics logs with filters",
        inputSchema: {
          type: "object",
          properties: {
            event: { type: "string", description: "Filter by event type" },
            limit: { type: "number", description: "Max results (default 10)" },
            from: { type: "string", description: "ISO date start (optional)" },
            to: { type: "string", description: "ISO date end (optional)" },
            surveyId: { type: "string", description: "Filter by surveyId inside payload" },
            responseId: { type: "string", description: "Filter by responseId inside payload" },
            textQuery: { type: "string", description: "Simple text contains match against JSON" },
          },
        },
      },
      {
        name: "log_analytics_event",
        description: "Log a new analytics event (useful for testing or manual entry)",
        inputSchema: {
          type: "object",
          properties: {
            event: { type: "string" },
            payload: { type: "object" },
          },
          required: ["event", "payload"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "search_analytics_logs") {
    const args = request.params.arguments as any;
    const where: any = {};
    if (args.event) where.event = { contains: args.event };
    if (args.from || args.to) {
      where.createdAt = {};
      if (args.from) where.createdAt.gte = new Date(args.from);
      if (args.to) where.createdAt.lte = new Date(args.to);
    }

    // JSON payload filters: try common shapes
    const payloadFilters: any[] = [];
    if (args.surveyId) {
      payloadFilters.push({ payload: { contains: { surveyId: args.surveyId } } });
      payloadFilters.push({ payload: { contains: { data: { surveyId: args.surveyId } } } });
      payloadFilters.push({ payload: { contains: { data: { response: { surveyId: args.surveyId } } } } });
    }
    if (args.responseId) {
      payloadFilters.push({ payload: { contains: { response: { id: args.responseId } } } });
      payloadFilters.push({ payload: { contains: { data: { response: { id: args.responseId } } } } });
    }
    if (payloadFilters.length) {
      where.OR = payloadFilters;
    }

    let logs = await prismaClient.analyticsLog.findMany({
      where,
      take: args.limit || 10,
      orderBy: { createdAt: "desc" },
    });

    if (args.textQuery) {
      const q = String(args.textQuery).toLowerCase();
      logs = logs.filter((l) => JSON.stringify(l.payload).toLowerCase().includes(q));
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(logs, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "log_analytics_event") {
    const args = request.params.arguments as any;
    const log = await prismaClient.analyticsLog.create({
      data: {
        event: args.event,
        payload: args.payload,
      },
    });
    return {
      content: [
        {
          type: "text",
          text: `Created log with ID: ${log.id}`,
        },
      ],
    };
  }

  throw new Error("Tool not found");
});

async function main() {
  // Ensure DATABASE_URL is present; set a sensible local default for dev
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/formbricks?schema=public";
    console.error("DATABASE_URL not set; using local default for dev.");
  }

  // Dynamic import after env is set
  const db = await import("@formbricks/database");
  prismaClient = db.prisma;

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Formbricks Analytics MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
