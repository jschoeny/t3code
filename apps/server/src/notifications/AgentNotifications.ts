import type { AgentNotification, OrchestratorMcpNotifyResult, ThreadId } from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as PubSub from "effect/PubSub";
import * as Ref from "effect/Ref";
import * as Stream from "effect/Stream";

import * as ThreadManagement from "../orchestration-v2/ThreadManagementService.ts";
import * as AgentAwarenessRelay from "../relay/AgentAwarenessRelay.ts";

/**
 * Notifications agents send with `t3_notify`: fanned out to connected clients and,
 * through T3 Connect, to phones. Thread activity is never touched.
 */
export class AgentNotifications extends Context.Service<
  AgentNotifications,
  {
    readonly send: (input: {
      readonly threadId: ThreadId;
      readonly message: string;
      readonly title?: string | undefined;
    }) => Effect.Effect<OrchestratorMcpNotifyResult>;
    readonly stream: Stream.Stream<AgentNotification>;
  }
>()("t3/notifications/AgentNotifications") {}

const make = Effect.gen(function* () {
  const relay = yield* AgentAwarenessRelay.AgentAwarenessRelay;
  const threads = yield* ThreadManagement.ThreadManagementService;
  const notifications = yield* PubSub.unbounded<AgentNotification>();
  const subscribers = yield* Ref.make(0);

  const stream = Stream.unwrap(
    Effect.gen(function* () {
      // Count only after subscribing, so a send never reports a client that cannot receive it.
      const subscription = yield* PubSub.subscribe(notifications);
      yield* Ref.update(subscribers, (count) => count + 1);
      yield* Effect.addFinalizer(() => Ref.update(subscribers, (count) => count - 1));
      return Stream.fromSubscription(subscription);
    }),
  );

  const send: AgentNotifications["Service"]["send"] = Effect.fn("AgentNotifications.send")(
    function* (input) {
      const shell = yield* threads
        .getThreadShell(input.threadId)
        .pipe(Effect.orElseSucceed(() => null));
      const notification = {
        threadId: input.threadId,
        title: input.title ?? (shell?.title.trim() || "T3 Code"),
        message: input.message,
      };
      const clients = yield* Ref.get(subscribers);
      if (clients > 0) yield* PubSub.publish(notifications, notification);
      const phone = yield* relay.publishNotification(notification);
      return { clients, ...phone };
    },
  );

  return AgentNotifications.of({ send, stream });
});

export const layer = Layer.effect(AgentNotifications, make);
