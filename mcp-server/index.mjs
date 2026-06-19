#!/usr/bin/env node
// Saldo MCP server — add/query expenses by talking to Claude.
// Configure with env SALDO_URL (https://saldo.your-domain.tld) and SALDO_TOKEN
// (your INGEST_WEBHOOK_TOKEN). See README.md.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.SALDO_URL?.replace(/\/$/, "");
const TOKEN = process.env.SALDO_TOKEN;
if (!BASE || !TOKEN) {
  console.error("Set SALDO_URL and SALDO_TOKEN environment variables.");
  process.exit(1);
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

const text = (v) => ({
  content: [
    { type: "text", text: typeof v === "string" ? v : JSON.stringify(v, null, 2) },
  ],
});
const handler = (fn) => async (args) => {
  try {
    return text(await fn(args));
  } catch (e) {
    return { content: [{ type: "text", text: `Erro: ${e.message}` }], isError: true };
  }
};

const server = new McpServer({ name: "saldo", version: "1.0.0" });

server.tool(
  "add_expense",
  "Add an expense (or refund) to Saldo, André's personal finance app.",
  {
    amount: z.number().describe("Amount in euros, e.g. 12.34"),
    category: z
      .string()
      .optional()
      .describe("Category name or slug, e.g. 'Day to day' or 'car'"),
    subcategory: z.string().optional().describe("Subcategory, e.g. 'Groceries'"),
    date: z.string().optional().describe("YYYY-MM-DD; defaults to today"),
    note: z.string().optional(),
    merchant: z.string().optional(),
    type: z.enum(["expense", "refund"]).optional(),
  },
  handler((args) =>
    api("/api/mcp/expense", { method: "POST", body: JSON.stringify(args) }),
  ),
);

server.tool(
  "get_month_summary",
  "Get a month's spending, budget, savings and top categories.",
  { month: z.string().optional().describe("YYYY-MM; defaults to current month") },
  handler(({ month }) =>
    api(`/api/mcp/summary${month ? `?month=${month}` : ""}`),
  ),
);

server.tool(
  "list_recent_expenses",
  "List the most recent expenses.",
  { limit: z.number().optional().describe("How many (max 50, default 10)") },
  handler(({ limit }) =>
    api(`/api/mcp/recent${limit ? `?limit=${limit}` : ""}`),
  ),
);

server.tool(
  "list_categories",
  "List the available categories and subcategories.",
  {},
  handler(() => api("/api/mcp/categories")),
);

await server.connect(new StdioServerTransport());
