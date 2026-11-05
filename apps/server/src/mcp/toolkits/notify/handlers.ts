import * as Effect from "effect/Effect";

import * as AgentNotifications from "../../../notifications/AgentNotifications.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";
import * as McpToolAccess from "../../McpToolAccess.ts";
import { NotifyToolkit } from "./tools.ts";

export const layer = McpToolAccess.toLayer(NotifyToolkit, {
  t3_notify: McpToolAccess.actsAsCaller((input) =>
    Effect.gen(function* () {
      const scope = yield* McpInvocationContext.McpInvocationContext;
      const { thread } = yield* McpInvocationContext.requireThreadScope(scope, "t3_notify");
      const notifications = yield* AgentNotifications.AgentNotifications;
      return yield* notifications.send({ threadId: thread.threadId, ...input });
    }),
  ),
});
