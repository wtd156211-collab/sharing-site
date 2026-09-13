import { describe, expect, it } from "vitest";
import { SpaceEventBus } from "./spaceEvents";

describe("space event bus", () => {
  it("broadcasts only to subscribers of the same space", () => {
    const bus = new SpaceEventBus();
    const first: unknown[] = [];
    const second: unknown[] = [];
    bus.subscribe(1, event => first.push(event));
    bus.subscribe(2, event => second.push(event));
    bus.publish(1, "entry.created", { entryId: 9, textContent: "private text" });
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
    expect((first[0] as { payload: Record<string, unknown> }).payload).toEqual({ entryId: 9 });
  });

  it("removes listeners and increments event ids", () => {
    const bus = new SpaceEventBus();
    const received: number[] = [];
    const unsubscribe = bus.subscribe(1, event => received.push(event.id));
    unsubscribe();
    bus.publish(1, "sync.ping", {});
    expect(received).toEqual([]);
    expect(bus.publish(1, "sync.ping", {}).id).toBe(2);
  });
});
