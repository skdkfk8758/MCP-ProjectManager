#!/usr/bin/env node

import { startServer } from "./server.js";

startServer().catch((error) => {
  console.error("Failed to start MCP Project Manager server:", error);
  process.exit(1);
});
