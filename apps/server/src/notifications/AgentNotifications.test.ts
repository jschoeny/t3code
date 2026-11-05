import { ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

import * as ThreadManagement from "../orchestration-v2/ThreadManagementService.ts";
import * as AgentAwarenessRelay from "../relay/AgentAwarenessRelay.ts";
import * as AgentNotifications from "./AgentNotifications.ts";

const threadId = ThreadId.make("thread");

const layer = AgentNotifications.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      Layer.mock(AgentAwarenessRelay.AgentAwarenessRelay)({
        publishNotification: () => Effect.succeed({ phone: "not_connected", phoneDevices: 0 }),
      }),
      Layer.mock(ThreadManagement.ThreadManagementService)({
        getThreadShell: () =>
          Effect.succeed({ title: "Fix flaky tests" } as Effect.Success<
            ReturnType<ThreadManagement.ThreadManagementService["Service"]["getThreadShell"]>
          >),
      }),
    ),
  ),
);

describe("AgentNotifications", () => {
  it.effect("reports only the clients subscribed when it sent", () =>
    Effect.gen(function* () {
      const notifications = yield* AgentNotifications.AgentNotifications;
      expect(yield* notifications.send({ threadId, message: "Nobody listening" })).toEqual({
        clients: 0,
        phone: "not_connected",
        phoneDevices: 0,
      });

      const received = yield* notifications.stream.pipe(
        Stream.take(2),
        Stream.runCollect,
        // Runs until it waits on the pubsub, so the subscription exists before the next send.
        Effect.forkScoped({ startImmediately: true }),
      );
      expect((yield* notifications.send({ threadId, message: "Tests pass" })).clients).toBe(1);
      yield* notifications.send({ threadId, message: "Ready", title: "PR #412" });
      expect(yield* Fiber.join(received)).toEqual([
        { threadId, title: "Fix flaky tests", message: "Tests pass" },
        { threadId, title: "PR #412", message: "Ready" },
      ]);
    }).pipe(Effect.provide(layer)),
  );
});
