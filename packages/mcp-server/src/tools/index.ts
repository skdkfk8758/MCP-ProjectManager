import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFlowEventTools } from "./flow-events.js";
import { registerFlowSessionTools } from "./flow-session.js";
import { registerFlowAgentTools } from "./flow-agent.js";
import { registerFlowTrackingTools } from "./flow-tracking.js";
import { registerPmProjectTools } from "./pm-project.js";
import { registerPmTaskTools } from "./pm-task.js";
import { registerPmMilestoneTools } from "./pm-milestone.js";
import { registerPmActionTools } from "./pm-actions.js";
import { registerPmQueryTools } from "./pm-query.js";
import { registerPmAnalysisTools } from "./pm-analysis.js";

export function registerAllTools(server: McpServer): void {
  registerFlowEventTools(server);
  registerFlowSessionTools(server);
  registerFlowAgentTools(server);
  registerFlowTrackingTools(server);
  registerPmProjectTools(server);
  registerPmTaskTools(server);
  registerPmMilestoneTools(server);
  registerPmActionTools(server);
  registerPmQueryTools(server);
  registerPmAnalysisTools(server);
}
