import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

export async function startServer() {
  const server = new McpServer({
    name: "mcp-project-manager",
    version: "1.0.0",
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
