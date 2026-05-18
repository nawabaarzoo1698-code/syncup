require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { getRedisClient } = require("./config/redis");
const feedRoutes = require("./routes/feed");
const logger = require("./config/logger");

// ─────────────────────────────────────────────────────────────────────────────
// App bootstrap
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO — must be created before routes so we can attach io to app
// ─────────────────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
  // Reconnection is handled by the client; pingTimeout helps detect dead sockets
  pingTimeout: 20000,
  pingInterval: 10000,
  // Allows load-balanced setups to work with sticky sessions or an adapter
  transports: ["websocket", "polling"],
});

// Attach io to Express so routes can emit events
app.set("io", io);

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO connection handling
// ─────────────────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  const clientId = socket.id;
  logger.info(`Socket connected: ${clientId}`);

  // All feed subscribers join a named room.
  // This lets us target only feed listeners and avoids sending events to future
  // admin-only or analytics rooms on the same server.
  socket.join("feed-room");

  // ── Heartbeat / ping-pong for custom connection health checks ──
  socket.on("ping", () => {
    socket.emit("pong", { ts: Date.now() });
  });

  socket.on("disconnect", (reason) => {
    logger.info(`Socket disconnected: ${clientId}`, { reason });
    // Socket.IO auto-removes the socket from all rooms on disconnect
  });

  socket.on("error", (err) => {
    logger.error(`Socket error on ${clientId}`, { error: err.message });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Express middleware
// ─────────────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (server-to-server, curl)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/feed", feedRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "4000", 10);

const start = async () => {
  await connectDB();

  // Eagerly connect Redis so first request hits the cache, not a cold start
  await getRedisClient().connect().catch(() => {
    // ioredis lazyConnect — connect() may be a no-op if already connecting
  });

  server.listen(PORT, () => {
    logger.info(`🚀 SyncUp backend running on http://localhost:${PORT}`);
    logger.info(`Socket.IO ready — accepting connections`);
  });
};

start();

// ─────────────────────────────────────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  // Force exit if graceful shutdown takes too long
  setTimeout(() => process.exit(1), 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason: String(reason) });
  process.exit(1);
});
