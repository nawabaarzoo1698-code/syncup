import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

/**
 * useSocket
 * ---------
 * Manages a Socket.IO connection with:
 * - Automatic reconnect (handled by socket.io-client, exposed as status)
 * - Deduplication via a seen-eventId Set so the same feed never renders twice
 *   (guards against double emissions, StrictMode double-mounts, fast reconnects)
 * - Heartbeat ping/pong to verify the connection is truly alive
 * - Callback-based event subscription so callers don't need to manage listeners
 *
 * @param {function} onNewFeed  called with a Feed object when feed:new fires
 * @returns {{ status, reconnectCount }}
 */
export const useSocket = (onNewFeed) => {
  const socketRef = useRef(null);
  const seenEventIds = useRef(new Set());
  const onNewFeedRef = useRef(onNewFeed);
  const heartbeatRef = useRef(null);
  const [status, setStatus] = useState("connecting"); // connecting | connected | reconnecting | disconnected
  const [reconnectCount, setReconnectCount] = useState(0);

  // Keep ref in sync so the socket listener always calls the latest callback
  // without needing to re-register the event handler on every render
  useEffect(() => {
    onNewFeedRef.current = onNewFeed;
  }, [onNewFeed]);

  const startHeartbeat = useCallback((socket) => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 15_000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  useEffect(() => {
    // ── Create socket (lazy — does not connect until .connect() or auto=true) ──
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,   // keep trying forever
      reconnectionDelay: 1000,          // start at 1 s
      reconnectionDelayMax: 30_000,     // cap at 30 s
      randomizationFactor: 0.3,         // jitter to avoid thundering herd
      timeout: 20_000,
    });
    socketRef.current = socket;

    // ── Connection lifecycle ────────────────────────────────────────────────
    socket.on("connect", () => {
      setStatus("connected");
      setReconnectCount(0);
      startHeartbeat(socket);
    });

    socket.on("disconnect", (reason) => {
      stopHeartbeat();
      // "io server disconnect" means the server intentionally disconnected us;
      // we need to manually reconnect. All other reasons are transient.
      if (reason === "io server disconnect") {
        socket.connect();
      }
      setStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setStatus("reconnecting");
    });

    socket.on("reconnect_attempt", (attempt) => {
      setStatus("reconnecting");
      setReconnectCount(attempt);
    });

    socket.on("reconnect", () => {
      setStatus("connected");
      setReconnectCount(0);
      startHeartbeat(socket);
    });

    socket.on("reconnect_failed", () => {
      setStatus("disconnected");
    });

    // ── Feed event with deduplication ──────────────────────────────────────
    socket.on("feed:new", (feed) => {
      const id = feed.eventId || feed._id;

      // Guard: drop duplicates (can arrive from fast reconnect + re-emit)
      if (seenEventIds.current.has(id)) return;
      seenEventIds.current.add(id);

      // Prevent the Set from growing unboundedly in long-lived sessions
      if (seenEventIds.current.size > 500) {
        const [first] = seenEventIds.current;
        seenEventIds.current.delete(first);
      }

      onNewFeedRef.current?.(feed);
    });

    // ── Cleanup on unmount ─────────────────────────────────────────────────
    return () => {
      stopHeartbeat();
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []); // intentionally empty — socket created once per mount

  return { status, reconnectCount };
};
