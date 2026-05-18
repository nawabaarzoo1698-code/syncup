import styles from "../styles/FeedCard.module.css";

const CATEGORY_COLORS = {
  mindset: { bg: "#f0f4ff", accent: "#4f6ef7", label: "🧠 Mindset" },
  nutrition: { bg: "#f0fdf4", accent: "#22c55e", label: "🥗 Nutrition" },
  training: { bg: "#fff7ed", accent: "#f97316", label: "🏋️ Training" },
  recovery: { bg: "#fdf4ff", accent: "#a855f7", label: "🛌 Recovery" },
  general: { bg: "#f8fafc", accent: "#64748b", label: "📌 General" },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
};

export default function FeedCard({ feed, isNew = false }) {
  const cat = CATEGORY_COLORS[feed.category] || CATEGORY_COLORS.general;

  return (
    <article
      className={`${styles.card} ${isNew ? styles.cardNew : ""}`}
      style={{ "--cat-accent": cat.accent, "--cat-bg": cat.bg }}
    >
      {feed.isPinned && <span className={styles.pinBadge}>📌 Pinned</span>}

      <div className={styles.meta}>
        <span className={styles.category} style={{ background: cat.bg, color: cat.accent }}>
          {cat.label}
        </span>
        <span className={styles.time}>{timeAgo(feed.createdAt)}</span>
      </div>

      <h2 className={styles.title}>{feed.title}</h2>
      <p className={styles.content}>{feed.content}</p>

      <div className={styles.footer}>
        <span className={styles.author}>— {feed.author}</span>
        {feed.tags?.length > 0 && (
          <div className={styles.tags}>
            {feed.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
