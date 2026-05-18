const express = require("express");
const router = express.Router();

const Feed = require("../models/Feed");
const { safeGet, safeSet, safeDel } = require("../config/redis");
const { validateFeedPost } = require("../middleware/validate");
const logger = require("../config/logger");

const CACHE_KEY = "feeds:all";
const CACHE_TTL = parseInt(process.env.FEED_CACHE_TTL || "60", 10);

// ─────────────────────────────────────────────────────────────────────────────
// GET /feed
// Returns all feeds sorted by pinned first, then newest.
// Cache-aside pattern: Redis → MongoDB → set cache.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    // 1. Try Redis cache first
    const cached = await safeGet(CACHE_KEY);
    if (cached) {
      logger.debug("GET /feed — cache HIT");
      return res.json({
        success: true,
        source: "cache",
        data: JSON.parse(cached),
      });
    }

    // 2. Cache miss — query MongoDB
    logger.debug("GET /feed — cache MISS, querying DB");
    const feeds = await Feed.find()
      .sort({ isPinned: -1, createdAt: -1 })
      .lean(); // lean() skips Mongoose hydration for 2-3× faster reads

    // 3. Populate cache for subsequent requests
    await safeSet(CACHE_KEY, JSON.stringify(feeds), CACHE_TTL);

    return res.json({ success: true, source: "db", data: feeds });
  } catch (err) {
    logger.error("GET /feed error", { error: err.message });
    return res.status(500).json({ success: false, message: "Failed to fetch feeds." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /feed
// Creates a new feed entry, invalidates cache, and emits a socket event.
// The `io` instance is attached by server.js via app.set("io", io).
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validateFeedPost, async (req, res) => {
  try {
    const feed = await Feed.create(req.validatedBody);

    // Invalidate stale cache so next GET re-fetches from DB
    await safeDel(CACHE_KEY);
    logger.debug("Cache invalidated after POST /feed", { eventId: feed.eventId });

    // Emit realtime event to ALL connected socket clients
    const io = req.app.get("io");
    if (io) {
      io.to("feed-room").emit("feed:new", feed.toObject());
      logger.debug("Socket event emitted: feed:new", { eventId: feed.eventId });
    }

    return res.status(201).json({ success: true, data: feed });
  } catch (err) {
    // Handle duplicate key (shouldn't happen with uuid but be safe)
    if (err.code === 11000) {
      logger.warn("Duplicate feed eventId — very unlikely with uuid v4", {
        error: err.message,
      });
      return res.status(409).json({ success: false, message: "Duplicate entry." });
    }
    logger.error("POST /feed error", { error: err.message });
    return res.status(500).json({ success: false, message: "Failed to create feed." });
  }
});

module.exports = router;
