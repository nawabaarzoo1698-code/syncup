# SyncUp — Real-time Coaching Feed

> **Assessment submission** — Built with Node.js, Express, MongoDB, Redis, Socket.IO, and Next.js 14.

A full-stack real-time coaching feed where coaches broadcast updates to athletes instantly — no page refresh needed.

---

## Live Features

- **Real-time updates** via Socket.IO — new posts appear on all clients instantly
- **Redis cache-aside** — `GET /feed` serves from cache; invalidated on every `POST /feed`
- **Server-side rendering** — home page loads with data on first paint (no loading flash)
- **Reconnect handling** — socket auto-reconnects with exponential backoff; re-fetches missed events on reconnect
- **Duplicate prevention** — UUID `eventId` per feed + client-side `seenEventIds` Set blocks double-renders
- **Live preview** — admin form shows real-time card preview as you type
- **Connection badge** — always-visible socket status (Live / Reconnecting / Offline)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 18+ |
| HTTP framework | Express 4 |
| Real-time | Socket.IO 4 |
| Database | MongoDB + Mongoose |
| Cache | Redis (ioredis) |
| Frontend | Next.js 14 (Pages Router) |
| Styling | CSS Modules |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
│                                                             │
│  Home (SSR + Socket)          Admin (CSR)                   │
│  ─────────────────────        ───────────                   │
│  getServerSideProps()         POST /feed form               │
│  useSocket() hook             Live preview                  │
│  Auto-refresh on reconnect    Client validation             │
└────────────────┬──────────────────────┬────────────────────┘
                 │ REST                 │ WebSocket
                 ▼                      ▼
┌────────────────────────────────────────────────────────────┐
│                    Express Backend                          │
│                                                             │
│  GET /feed                POST /feed                       │
│  ───────────              ──────────                       │
│  1. Check Redis           1. Validate body                 │
│  2. Miss → MongoDB        2. Save to MongoDB               │
│  3. Set cache (60s)       3. Invalidate Redis cache        │
│                           4. Emit feed:new via Socket.IO   │
└──────────┬────────────────────────┬───────────────────────┘
           │                        │
           ▼                        ▼
       MongoDB                  Redis
    (source of truth)        (TTL = 60s)
```

---

## Project Structure

```
syncup/
├── package.json                  ← root: runs both with concurrently
│
├── backend/
│   ├── server.js                 ← Express + Socket.IO entry point
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   ├── db.js                 ← MongoDB with retry logic
│   │   ├── redis.js              ← ioredis with safe wrappers
│   │   └── logger.js             ← Winston logger
│   ├── models/
│   │   └── Feed.js               ← Mongoose schema + eventId (UUID)
│   ├── routes/
│   │   └── feed.js               ← GET /feed · POST /feed
│   └── middleware/
│       └── validate.js           ← body validation, no external libs
│
└── frontend/
    ├── pages/
    │   ├── _app.js               ← Navbar + global layout
    │   ├── _document.js          ← HTML shell + Google Fonts
    │   ├── index.js              ← Home page (SSR + realtime)
    │   ├── admin.js              ← Admin page (post feed)
    │   ├── 404.js                ← Custom not found
    │   └── 500.js                ← Custom server error
    ├── components/
    │   ├── FeedCard.js           ← Feed card with category colors
    │   └── ConnectionBadge.js    ← Socket status indicator
    ├── hooks/
    │   └── useSocket.js          ← Socket lifecycle + dedup + heartbeat
    └── styles/
        ├── globals.css
        ├── Home.module.css
        ├── Admin.module.css
        ├── FeedCard.module.css
        ├── ConnectionBadge.module.css
        └── Error.module.css
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/syncup.git
cd syncup
```

### 2. Set up environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env`:
```
PORT=4000
MONGO_URI=mongodb://localhost:27017/syncup
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGINS=http://localhost:3000
FEED_CACHE_TTL=60
```

### 3. Install all dependencies

```bash
npm install
npm run install:all
```

### 4. Start MongoDB and Redis

```bash
mongod           # terminal 1
redis-server     # terminal 2
```

### 5. Run the project

```bash
npm run dev
```

Opens backend on `http://localhost:4000` and frontend on `http://localhost:3000`.

---

## API Reference

### GET /feed

Returns all feeds, pinned first, newest first.

```bash
curl http://localhost:4000/feed
```

Response:
```json
{
  "success": true,
  "source": "cache",
  "data": [{ "_id": "...", "eventId": "uuid-v4", "title": "...", "author": "...", "category": "nutrition" }]
}
```

### POST /feed

Creates a new feed and broadcasts via Socket.IO.

```bash
curl -X POST http://localhost:4000/feed \
  -H "Content-Type: application/json" \
  -d '{ "title": "Sprint drill", "content": "3x40m sprints", "author": "Coach Nawab", "category": "training" }'
```

**Category options:** `general` · `mindset` · `nutrition` · `training` · `recovery`

### GET /health

```bash
curl http://localhost:4000/health
```

---

## Socket.IO Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `feed:new` | server → client | Feed object | Broadcast on every POST |
| `ping` | client → server | — | Heartbeat from client |
| `pong` | server → client | `{ ts }` | Heartbeat response |

---

## Key Design Decisions

**Redis cache-aside** — Read from cache, fall through to DB on miss, repopulate. Cache is busted immediately on write. Redis failures are silent — app always falls back to MongoDB.

**Socket.IO rooms** — All subscribers join `feed-room`. Swapping in `@socket.io/redis-adapter` enables horizontal scaling with zero code change.

**Duplicate prevention** — Each document gets a UUID `eventId`. Frontend `useSocket` hook tracks seen IDs in a `Set` and drops duplicates — guards against StrictMode double-mounts and fast reconnects.

**Auto-refresh on reconnect** — When socket reconnects after a drop, home page calls `GET /feed` to catch missed events.

**SSR for home page** — `getServerSideProps` hydrates the page with data immediately. Socket events append new cards with a slide-in animation.

---

## Author

**Nawab Aarzoo** — Backend Engineer  
[GitHub](https://github.com/YOUR_USERNAME)
