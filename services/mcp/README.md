Madarisse MCP Server — exposes read-only school management tools to Claude Desktop and Cursor via the Model Context Protocol.

Install dependencies with `uv` from this directory: `uv sync`

To connect from Claude Desktop, add the following to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "madarisse": {
      "command": "uvx",
      "args": ["--from", ".", "python", "-m", "server"],
      "env": {
        "MCP_API_KEY": "your-key",
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

All tools require an `api_key` argument matching the `MCP_API_KEY` env var (default: `dev-mcp-key`).

Available tools: `search_students`, `get_student_detail`, `get_class_list`, `get_pending_enrollments`, `get_payment_stats`, `get_unpaid_students`, `get_recovery_rate`.
