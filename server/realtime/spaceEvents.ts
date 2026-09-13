export type SpaceEventType = "entry.created" | "comment.created" | "comment.replied" | "entry.deleted" | "space.updated" | "sync.ping";

export type SpaceEvent = {
  id: number;
  spaceId: number;
  type: SpaceEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};

type Listener = (event: SpaceEvent) => void;

const safePayloadKeys = new Set(["entryId", "commentId", "spaceId", "status", "version"]);

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key, value]) => safePayloadKeys.has(key) && (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null)));
}

export class SpaceEventBus {
  private nextId = 1;
  private readonly listeners = new Map<number, Set<Listener>>();

  subscribe(spaceId: number, listener: Listener): () => void {
    const set = this.listeners.get(spaceId) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(spaceId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(spaceId);
    };
  }

  publish(spaceId: number, type: SpaceEventType, payload: Record<string, unknown>, eventId?: number): SpaceEvent {
    const id = eventId ?? this.nextId;
    this.nextId = Math.max(this.nextId, id + 1);
    const event: SpaceEvent = { id, spaceId, type, payload: sanitizePayload(payload), createdAt: new Date().toISOString() };
    (this.listeners.get(spaceId) ?? new Set<Listener>()).forEach(listener => listener(event));
    return event;
  }
}

export const spaceEventBus = new SpaceEventBus();
