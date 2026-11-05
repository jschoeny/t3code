import {
  OrchestratorMcpFailure,
  OrchestratorMcpNotifyInput,
  OrchestratorMcpNotifyResult,
} from "@t3tools/contracts";
import { McpSchema, Tool, Toolkit } from "effect/ai";

import * as AgentNotifications from "../../../notifications/AgentNotifications.ts";
import * as ThreadManagementService from "../../../orchestration-v2/ThreadManagementService.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";

const NotifyTool = Tool.make("t3_notify", {
  description:
    "Notify the user on their computer and phone; tapping opens this thread. Only when they asked to be notified, in this conversation or in project instructions such as AGENTS.md. Follow their instructions on when and what to send. No such request: don't call it.",
  parameters: OrchestratorMcpNotifyInput,
  success: OrchestratorMcpNotifyResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: [
    McpInvocationContext.McpInvocationContext,
    ThreadManagementService.ThreadManagementService,
    AgentNotifications.AgentNotifications,
  ],
})
  .annotate(Tool.Title, "Notify the user")
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, true)
  // The parent decides when the user hears about delegated work.
  .annotate(McpSchema.EnabledWhen, McpInvocationContext.hiddenFromSubagents);

export const NotifyToolkit = Toolkit.make(NotifyTool);
