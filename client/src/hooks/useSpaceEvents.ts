import { useCallback, useEffect, useRef, useState } from "react";

type EventStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed";

export function useSpaceEvents(token: string | undefined) {
  const [status, setStatus] = useState<EventStatus>(token ? "connecting" : "idle");
  const [lastEventId, setLastEventId] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastEventIdRef = useRef(0);
  const sourceRef = useRef<EventSource | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const retryRef = useRef(0);
  const reconnect = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    retryRef.current = 0;
    setStatus(token ? "reconnecting" : "idle");
    setUnreadCount(0);
    connectRef.current?.();
  }, [token]);

  useEffect(() => {
    if (!token) { setStatus("idle"); return; }
    let cancelled = false;
    let timer: number | undefined;
    const delays = [1000, 2000, 5000, 10000, 30000];
    const connect = () => {
      if (cancelled) return;
      setStatus(retryRef.current ? "reconnecting" : "connecting");
      const source = new EventSource(`/api/share/${encodeURIComponent(token)}/events`, { withCredentials: true });
      sourceRef.current = source;
      source.onopen = () => { retryRef.current = 0; setStatus("open"); };
      const handleEvent = (event: MessageEvent) => {
        const id = Number(event.lastEventId || 0);
        if (id > 0 && id <= lastEventIdRef.current) return;
        if (id > 0) { lastEventIdRef.current = id; setLastEventId(id); }
        setUnreadCount(count => count + 1);
      };
      ["entry.created", "comment.created", "comment.replied", "entry.deleted", "space.updated", "sync.ping"].forEach(type => source.addEventListener(type, handleEvent));
      source.onerror = () => {
        source.close();
        if (cancelled) return;
        setStatus("reconnecting");
        const delay = delays[Math.min(retryRef.current, delays.length - 1)];
        retryRef.current += 1;
        timer = window.setTimeout(connect, delay);
      };
    };
    connectRef.current = connect;
    connect();
    const onVisibility = () => { if (document.visibilityState === "visible") reconnect(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); sourceRef.current?.close(); sourceRef.current = null; connectRef.current = null; document.removeEventListener("visibilitychange", onVisibility); setStatus("closed"); };
  }, [token, reconnect]);

  return { status, lastEventId, unreadCount, reconnect };
}
