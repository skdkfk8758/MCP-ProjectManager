#!/usr/bin/env node

import { Command } from "commander";
import { setup } from "./commands/init.js";
import { start, stop, status } from "./commands/service.js";
import { teardown } from "./commands/teardown.js";

const program = new Command();

program
  .name("mcp-pm")
  .description("MCP Project Manager - CLI for managing the project management system")
  .version("1.0.0");

program
  .command("setup")
  .description("Full setup: check environment, build, start services, register MCP & hooks")
  .action(setup);

program
  .command("start")
  .description("Start services (backend + dashboard)")
  .argument("[service]", "Service to start: backend, dashboard, or all (default)")
  .action(start);

program
  .command("stop")
  .description("Stop all running services")
  .action(stop);

program
  .command("status")
  .description("Check status of all services, builds, hooks, and database")
  .action(status);

program
  .command("teardown")
  .description("Stop services and remove MCP server + hooks from current project")
  .action(teardown);

program.parse();
