// api/rows.js — the only "backend" in this project.
//
// Vercel turns every file in the /api folder into a small server function.
// This one lives at  https://your-site.vercel.app/api/rows  and does 3 things:
//
//   GET    /api/rows          -> send back every company in the tracker
//   PUT    /api/rows          -> save one company (body: { row: {...} })
//   DELETE /api/rows?id=abc   -> remove one company
//
// Every request must carry the team password in the "x-team-password" header.
// The real password is never in the code: it lives in a Vercel environment
// variable called TEAM_PASSWORD, so it never ends up on GitHub.
//
// The data is stored in Upstash Redis as one "hash" (think: a dictionary)
// called gge:rows, where each key is a row id and each value is that row.

import { Redis } from "@upstash/redis";

// When you connect Upstash in Vercel, it adds the database address and key as
// environment variables. Their exact names depend on the prefix you chose
// (KV_REST_API_URL, UPSTASH_REDIS_REST_URL, STORAGE_KV_REST_API_URL, ...),
// so we look for any of them instead of guessing one name.
function findEnv(kind) {
  const env = process.env;
  const exact = kind === "url"
    ? ["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"]
    : ["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"];
  for (const k of exact) if (env[k]) return env[k];
  const re = kind === "url" ? /(KV_REST_API_URL|REDIS_REST_URL)$/ : /(KV_REST_API_TOKEN|REDIS_REST_TOKEN)$/;
  const key = Object.keys(env).find((k) => re.test(k) && !/READ_ONLY/.test(k) && env[k]);
  return key ? env[key] : "";
}
const DB_URL = findEnv("url");
const DB_TOKEN = findEnv("token");
const redis = DB_URL && DB_TOKEN ? new Redis({ url: DB_URL, token: DB_TOKEN }) : null;

const KEY = "gge:rows";
const MAX_ROW_BYTES = 20000; // a tracker row is tiny; this stops junk uploads

// Compare passwords in a way that doesn't leak timing hints.
function passwordOk(given) {
  const real = process.env.TEAM_PASSWORD || "";
  if (!real || typeof given !== "string" || given.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// Only keep the fields the page actually uses, as plain text/numbers.
function cleanRow(row) {
  const str = (v, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
  const steps = {};
  if (row.steps && typeof row.steps === "object") {
    for (const [k, v] of Object.entries(row.steps).slice(0, 30)) {
      if (/^[a-z]{1,20}$/.test(k) && typeof v === "string") steps[k] = v.slice(0, 10);
    }
  }
  return {
    id: str(row.id, 40),
    company: str(row.company, 120),
    contact: str(row.contact, 160),
    channel: str(row.channel, 20),
    stage: str(row.stage, 20),
    last: str(row.last, 10),
    notes: str(row.notes, 2000),
    lastAction: str(row.lastAction, 200),
    steps,
    created: Number(row.created) || Date.now(),
    updated: Number(row.updated) || Date.now(),
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store"); // always fresh data

  if (!process.env.TEAM_PASSWORD) {
    return res.status(500).json({ error: "TEAM_PASSWORD isn't set. In Vercel: Settings → Environment Variables → add TEAM_PASSWORD, then Redeploy." });
  }
  if (!passwordOk(req.headers["x-team-password"])) {
    return res.status(401).json({ error: "Wrong password" });
  }
  if (!redis) {
    return res.status(500).json({
      error: "The database isn't connected. In Vercel: Storage → connect Upstash Redis to this project, then Redeploy.",
    });
  }

  try {
    if (req.method === "GET") {
      const all = (await redis.hgetall(KEY)) || {};
      // Upstash returns each value already parsed; older values may be strings.
      const rows = Object.values(all).map((v) => (typeof v === "string" ? JSON.parse(v) : v));
      return res.status(200).json({ rows });
    }

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const row = body && body.row;
      if (!row || typeof row.id !== "string" || !/^[a-z0-9]{4,40}$/i.test(row.id)) {
        return res.status(400).json({ error: "Missing or bad row id" });
      }
      const clean = cleanRow(row);
      const json = JSON.stringify(clean);
      if (json.length > MAX_ROW_BYTES) return res.status(413).json({ error: "Row too large" });
      await redis.hset(KEY, { [clean.id]: json });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!/^[a-z0-9]{4,40}$/i.test(id)) return res.status(400).json({ error: "Bad id" });
      await redis.hdel(KEY, id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err); // shows up in Vercel → your project → Logs
    return res.status(500).json({ error: "Database error: " + (err && err.message ? err.message : "unknown") });
  }
}
