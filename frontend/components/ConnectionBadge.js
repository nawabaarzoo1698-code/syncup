import styles from "../styles/ConnectionBadge.module.css";

const STATUS_CONFIG = {
  connected: { label: "Live", color: "#22c55e", pulse: true },
  connecting: { label: "Connecting…", color: "#f59e0b", pulse: true },
  reconnecting: { label: "Reconnecting…", color: "#f59e0b", pulse: true },
  disconnected: { label: "Offline", color: "#ef4444", pulse: false },
};

export default function ConnectionBadge({ status, reconnectCount }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.connecting;

  return (
    <div className={styles.badge} style={{ "--dot-color": cfg.color }}>
      <span className={`${styles.dot} ${cfg.pulse ? styles.pulse : ""}`} />
      <span className={styles.label}>{cfg.label}</span>
      {reconnectCount > 0 && (
        <span className={styles.attempt}>attempt #{reconnectCount}</span>
      )}
    </div>
  );
}
