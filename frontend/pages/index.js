import { useState, useCallback, useEffect, useRef } from "react";
import Head from "next/head";
import FeedCard from "../components/FeedCard";
import ConnectionBadge from "../components/ConnectionBadge";
import { useSocket } from "../hooks/useSocket";
import styles from "../styles/Home.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ─── Server-side: initial feed data ──────────────────────────────────────────
export async function getServerSideProps() {
  try {
    const res = await fetch(`${API_URL}/feed`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return { props: { initialFeeds: json.data || [], error: null } };
  } catch (err) {
    console.error("SSR feed fetch failed:", err.message);
    return { props: { initialFeeds: [], error: "Could not load feeds from server." } };
  }
}

// ─── Home page component ──────────────────────────────────────────────────────
export default function HomePage({ initialFeeds, error: serverError }) {
  const [feeds, setFeeds] = useState(initialFeeds);
  const [newIds, setNewIds] = useState(new Set()); // tracks which cards to animate
  const [fetchError, setFetchError] = useState(serverError);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const feedTopRef = useRef(null);

  // Called by useSocket when a feed:new event arrives
  const handleNewFeed = useCallback((feed) => {
    setFeeds((prev) => {
      // Guard: if somehow this feed already exists (e.g. optimistic update), skip
      if (prev.some((f) => f.eventId === feed.eventId || f._id === feed._id)) {
        return prev;
      }
      return [feed, ...prev];
    });

    // Mark as new for 3 s so the card plays its entrance animation
    const id = feed.eventId || feed._id;
    setNewIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 3000);

    // Scroll to top so the user sees the new card
    feedTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const { status, reconnectCount } = useSocket(handleNewFeed);

  // Manual refresh — useful when user has been offline and reconnects
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_URL}/feed`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setFeeds(json.data || []);
    } catch (err) {
      setFetchError("Failed to refresh feeds. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh when socket reconnects after a disconnect
  // (we may have missed events while offline)
  useEffect(() => {
    if (status === "connected" && reconnectCount > 0) {
      handleRefresh();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Head>
        <title>SyncUp — Coaching Feed</title>
        <meta name="description" content="Real-time coaching updates for athletes" />
      </Head>

      <main className={styles.main}>
        <div className="container">
          {/* ── Header ── */}
          <div className="page-header">
            <p className="page-header__eyebrow">Coaching Intelligence</p>
            <h1 className="page-header__title">Live Feed</h1>
            <p className="page-header__sub">
              Real-time insights from your coaching staff
            </p>
          </div>

          {/* ── Toolbar ── */}
          <div className={styles.toolbar}>
            <ConnectionBadge status={status} reconnectCount={reconnectCount} />

            <div className={styles.toolbarRight}>
              <span className={styles.feedCount}>
                {feeds.length} {feeds.length === 1 ? "update" : "updates"}
              </span>
              <button
                className={styles.refreshBtn}
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Refresh feed"
              >
                <span className={isRefreshing ? styles.spin : ""}>↺</span>
                {isRefreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* ── Error banner ── */}
          {fetchError && (
            <div className={styles.errorBanner} role="alert">
              <span>⚠ {fetchError}</span>
              <button onClick={() => setFetchError(null)} className={styles.dismissBtn}>
                ✕
              </button>
            </div>
          )}

          {/* ── Feed list ── */}
          <div className={styles.feedList} ref={feedTopRef}>
            {feeds.length === 0 && !fetchError ? (
              <div className={styles.empty}>
                <p className={styles.emptyIcon}>📭</p>
                <p className={styles.emptyTitle}>No updates yet</p>
                <p className={styles.emptySub}>
                  Head to the Admin page to post the first coaching update.
                </p>
              </div>
            ) : (
              feeds.map((feed) => (
                <FeedCard
                  key={feed.eventId || feed._id}
                  feed={feed}
                  isNew={newIds.has(feed.eventId || feed._id)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
