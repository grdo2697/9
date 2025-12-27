import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import crypto from "crypto";
import fs from "fs";
import path from "path";

dotenv.config();

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const DATA_DIR = path.resolve("./data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function readDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    const seed = {
      users: [
        { id: "u_admin", name: "المسؤول الرئيسي", email: "admin@smart-era.com", password: "admin123", role: "admin", avatar: null, status: "متاح" },
        { id: "u_emp1", name: "أحمد محمد", email: "ahmed@smart-era.com", password: "ahmed123", role: "employee", avatar: null, status: "متاح" },
        { id: "u_mgr", name: "سارة خالد", email: "sara@smart-era.com", password: "sara123", role: "manager", avatar: null, status: "متاح" }
      ],
      settings: {
        // per-user settings keyed by userId
      },
      chats: [
        // { id, a, b, createdAt, lastMessageAt }
      ],
      messages: [
        // { id, chatId, from, to, text, createdAt, readAt }
      ],
      notifications: {
        // per-user list: { [userId]: [{id,type,title,body,createdAt,readAt}] }
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
  return safeJsonParse(fs.readFileSync(DB_PATH, "utf8"), null);
}

function writeDb(db) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function uid(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function hashToken() {
  return crypto.randomBytes(24).toString("base64url");
}

/* -------------------------------------------------------------------------- */
/*                                   Server                                   */
/* -------------------------------------------------------------------------- */

const app = express();
app.use(cors());
app.use(express.json({ limit: "3mb" }));

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" }
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory sessions (simple + fast). For production use a DB/Redis.
const sessions = new Map(); // token -> { userId, createdAt }

function authFromReq(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  const sess = sessions.get(token);
  return sess ? { token, ...sess } : null;
}

function requireAuth(req, res, next) {
  const sess = authFromReq(req);
  if (!sess) return res.status(401).json({ error: "UNAUTHORIZED" });
  req.session = sess;
  next();
}

/* -------------------------------------------------------------------------- */
/*                                   Health                                   */
/* -------------------------------------------------------------------------- */

app.get("/health", (_req, res) => res.json({ ok: true }));

/* -------------------------------------------------------------------------- */
/*                                  Auth API                                  */
/* -------------------------------------------------------------------------- */

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const db = readDb();
  const user = (db.users || []).find(u => (u.email || "").toLowerCase() === String(email || "").toLowerCase());
  if (!user || String(user.password) !== String(password)) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "بيانات الدخول غير صحيحة" });
  }
  const token = hashToken();
  sessions.set(token, { userId: user.id, createdAt: nowIso() });
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, status: user.status }
  });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  sessions.delete(req.session.token);
  res.json({ ok: true });
});

app.get("/api/me", requireAuth, (req, res) => {
  const db = readDb();
  const user = (db.users || []).find(u => u.id === req.session.userId);
  if (!user) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, status: user.status });
});

app.get("/api/users", requireAuth, (req, res) => {
  const db = readDb();
  const list = (db.users || []).map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, status: u.status }));
  res.json({ users: list });
});

app.put("/api/profile", requireAuth, (req, res) => {
  const { name, status, avatar } = req.body || {};
  const db = readDb();
  const idx = (db.users || []).findIndex(u => u.id === req.session.userId);
  if (idx < 0) return res.status(404).json({ error: "NOT_FOUND" });
  if (typeof name === "string" && name.trim()) db.users[idx].name = name.trim();
  if (typeof status === "string") db.users[idx].status = status.slice(0, 80);
  if (typeof avatar === "string") db.users[idx].avatar = avatar; // dataURL
  writeDb(db);
  io.to(req.session.userId).emit("profile_updated", {
    id: db.users[idx].id,
    name: db.users[idx].name,
    avatar: db.users[idx].avatar,
    status: db.users[idx].status
  });
  res.json({ ok: true, user: { id: db.users[idx].id, name: db.users[idx].name, avatar: db.users[idx].avatar, status: db.users[idx].status } });
});

/* -------------------------------------------------------------------------- */
/*                                 Settings API                               */
/* -------------------------------------------------------------------------- */

app.get("/api/settings", requireAuth, (req, res) => {
  const db = readDb();
  const s = (db.settings && db.settings[req.session.userId]) || {
    privacy_last_seen: "everyone",
    privacy_read_receipts: true,
    notifications_enabled: true,
    notifications_sound: true,
    chat_wallpaper: "wa1",
    chat_font_size: "md"
  };
  res.json({ settings: s });
});

app.put("/api/settings", requireAuth, (req, res) => {
  const db = readDb();
  db.settings = db.settings || {};
  const current = (db.settings[req.session.userId]) || {};
  const next = { ...current, ...(req.body || {}) };
  db.settings[req.session.userId] = next;
  writeDb(db);
  io.to(req.session.userId).emit("settings_updated", next);
  res.json({ ok: true, settings: next });
});

/* -------------------------------------------------------------------------- */
/*                             Notifications API                               */
/* -------------------------------------------------------------------------- */

app.get("/api/notifications", requireAuth, (req, res) => {
  const db = readDb();
  const list = (db.notifications && db.notifications[req.session.userId]) || [];
  res.json({ notifications: list.slice(-50).reverse() });
});

app.post("/api/notifications/mark-read", requireAuth, (req, res) => {
  const { ids } = req.body || {};
  const db = readDb();
  db.notifications = db.notifications || {};
  db.notifications[req.session.userId] = db.notifications[req.session.userId] || [];
  const set = new Set(Array.isArray(ids) ? ids : []);
  db.notifications[req.session.userId] = db.notifications[req.session.userId].map(n => set.has(n.id) ? { ...n, readAt: n.readAt || nowIso() } : n);
  writeDb(db);
  res.json({ ok: true });
});

/* -------------------------------------------------------------------------- */
/*                                 Chat API                                    */
/* -------------------------------------------------------------------------- */

function ensureChat(db, a, b) {
  const [x, y] = [a, b].sort();
  let chat = (db.chats || []).find(c => {
    const [ca, cb] = [c.a, c.b].sort();
    return ca === x && cb === y;
  });
  if (!chat) {
    chat = { id: uid("chat"), a, b, createdAt: nowIso(), lastMessageAt: nowIso() };
    db.chats = db.chats || [];
    db.chats.push(chat);
  }
  return chat;
}

function pushNotification(db, userId, payload) {
  db.notifications = db.notifications || {};
  db.notifications[userId] = db.notifications[userId] || [];
  const n = {
    id: uid("n"),
    type: payload.type || "info",
    title: payload.title || "إشعار",
    body: payload.body || "",
    createdAt: nowIso(),
    readAt: null
  };
  db.notifications[userId].push(n);
  return n;
}

app.get("/api/chats", requireAuth, (req, res) => {
  const db = readDb();
  const me = req.session.userId;
  const chats = (db.chats || [])
    .filter(c => c.a === me || c.b === me)
    .sort((a, b) => (b.lastMessageAt || "") > (a.lastMessageAt || "") ? 1 : -1);

  const usersMap = new Map((db.users || []).map(u => [u.id, u]));
  const messages = db.messages || [];

  const result = chats.map(c => {
    const peerId = c.a === me ? c.b : c.a;
    const peer = usersMap.get(peerId);
    const unread = messages.filter(m => m.chatId === c.id && m.to === me && !m.readAt).length;
    const last = [...messages].reverse().find(m => m.chatId === c.id);
    return {
      id: c.id,
      peer: peer ? { id: peer.id, name: peer.name, avatar: peer.avatar, status: peer.status } : { id: peerId, name: "مستخدم", avatar: null, status: "" },
      unread,
      lastMessage: last ? { text: last.text, at: last.createdAt, from: last.from } : null,
      updatedAt: c.lastMessageAt
    };
  });

  res.json({ chats: result });
});

app.get("/api/chats/:chatId/messages", requireAuth, (req, res) => {
  const db = readDb();
  const me = req.session.userId;
  const chat = (db.chats || []).find(c => c.id === req.params.chatId);
  if (!chat || (chat.a !== me && chat.b !== me)) return res.status(404).json({ error: "NOT_FOUND" });
  const msgs = (db.messages || []).filter(m => m.chatId === chat.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  res.json({ messages: msgs });
});

app.post("/api/chats/:chatId/read", requireAuth, (req, res) => {
  const db = readDb();
  const me = req.session.userId;
  const chat = (db.chats || []).find(c => c.id === req.params.chatId);
  if (!chat || (chat.a !== me && chat.b !== me)) return res.status(404).json({ error: "NOT_FOUND" });
  db.messages = (db.messages || []).map(m => (m.chatId === chat.id && m.to === me && !m.readAt) ? { ...m, readAt: nowIso() } : m);
  writeDb(db);
  res.json({ ok: true });
});

app.post("/api/messages/send", requireAuth, (req, res) => {
  const { toUserId, text } = req.body || {};
  const me = req.session.userId;
  const t = String(text || "").trim();
  if (!toUserId || !t) return res.status(400).json({ error: "BAD_REQUEST" });
  const db = readDb();
  const to = (db.users || []).find(u => u.id === toUserId);
  if (!to) return res.status(404).json({ error: "USER_NOT_FOUND" });
  const chat = ensureChat(db, me, toUserId);
  const msg = { id: uid("m"), chatId: chat.id, from: me, to: toUserId, text: t.slice(0, 2000), createdAt: nowIso(), readAt: null };
  db.messages = db.messages || [];
  db.messages.push(msg);
  chat.lastMessageAt = msg.createdAt;

  // notifications for recipient
  const n = pushNotification(db, toUserId, {
    type: "message",
    title: "رسالة جديدة",
    body: t.length > 80 ? t.slice(0, 80) + "…" : t
  });

  writeDb(db);

  // Realtime
  io.to(me).emit("message", msg);
  io.to(toUserId).emit("message", msg);
  io.to(toUserId).emit("notification", n);
  res.json({ ok: true, message: msg, chatId: chat.id });
});

/* -------------------------------------------------------------------------- */
/*                                  AI API                                    */
/* -------------------------------------------------------------------------- */

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};
    const safe = Array.isArray(messages) ? messages.slice(-20) : [];
    const input = safe.map(m => {
      const role = (m.role === "user" || m.role === "assistant" || m.role === "system") ? m.role : "user";
      return { role, content: String(m.content || "") };
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      input: input.length ? input : "مرحبا",
      temperature: 0.4
    });

    res.json({ reply: response.output_text || "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI_ERROR", message: err?.message || "Failed" });
  }
});

/* -------------------------------------------------------------------------- */
/*                                  Socket.io                                 */
/* -------------------------------------------------------------------------- */

io.on("connection", (socket) => {
  let userId = null;

  socket.on("auth", ({ token }) => {
    const sess = sessions.get(token);
    if (!sess) {
      socket.emit("auth_error", { error: "UNAUTHORIZED" });
      return;
    }
    userId = sess.userId;
    socket.join(userId);
    socket.emit("auth_ok", { userId });
  });

  socket.on("typing", ({ toUserId, isTyping }) => {
    if (!userId || !toUserId) return;
    io.to(toUserId).emit("typing", { from: userId, isTyping: !!isTyping });
  });

  socket.on("disconnect", () => {
    userId = null;
  });
});

/* -------------------------------------------------------------------------- */
/*                                  Listen                                    */
/* -------------------------------------------------------------------------- */

const port = process.env.PORT || 8787;
httpServer.listen(port, () => console.log(`Server running on http://localhost:${port}`));
