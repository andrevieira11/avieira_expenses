# Saldo MCP server

Add and query your expenses by talking to Claude. Exposes four tools —
`add_expense`, `get_month_summary`, `list_recent_expenses`, `list_categories` —
which call your deployed Saldo over its token-authed API.

## Install

```bash
cd mcp-server
npm install
```

## Configure (Claude Desktop)

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "saldo": {
      "command": "node",
      "args": ["/absolute/path/to/saldo/mcp-server/index.mjs"],
      "env": {
        "SALDO_URL": "https://saldo.your-domain.tld",
        "SALDO_TOKEN": "<your INGEST_WEBHOOK_TOKEN>"
      }
    }
  }
}
```

`SALDO_TOKEN` is the same `INGEST_WEBHOOK_TOKEN` from your server `.env`. Restart Claude
Desktop, then try: *"add a 12,50 € lunch expense to dining out"* or *"how much did I
spend this month?"*.

## For Claude Code

```bash
claude mcp add saldo -e SALDO_URL=https://saldo.your-domain.tld -e SALDO_TOKEN=<token> -- node /abs/path/mcp-server/index.mjs
```
