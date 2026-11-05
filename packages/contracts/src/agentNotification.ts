import * as Schema from "effect/Schema";

import { ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";

/** A notification an agent sent with `t3_notify`; `title` is already resolved. */
export const AgentNotification = Schema.Struct({
  threadId: ThreadId,
  title: TrimmedNonEmptyString,
  message: TrimmedNonEmptyString,
});
export type AgentNotification = typeof AgentNotification.Type;
