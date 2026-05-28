const express  = require('express');
const webpush  = require('web-push');
const cron     = require('node-cron');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());

// ── VAPID setup ───────────────────────────────────────────
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE;
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('\n❌  VAPID keys not set!');
  console.error('   Run:  npm run generate-keys');
  console.error('   Then add VAPID_PUBLIC and VAPID_PRIVATE to your environment.\n');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
console.log('✅  VAPID keys loaded');

// ── Simple JSON database ──────────────────────────────────
// Structure: { subscriptions: { [clientId]: { subscription, tasks, timezone } } }
const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { subscriptions: {} }; }
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Routes ────────────────────────────────────────────────

// Client fetches VAPID public key to create subscription
app.get('/api/vapidPublicKey', (req, res) => {
  res.json({ key: VAPID_PUBLIC });
});

// Client registers push subscription
app.post('/api/subscribe', (req, res) => {
  const { subscription, clientId, timezone } = req.body;
  if (!subscription || !clientId) return res.status(400).json({ error: 'Missing fields' });

  const db = readDB();
  const existing = db.subscriptions[clientId] || {};
  db.subscriptions[clientId] = {
    subscription,
    tasks:    existing.tasks || [],
    timezone: timezone || 'UTC',
    updatedAt: new Date().toISOString(),
  };
  writeDB(db);
  console.log(`[subscribe] clientId=${clientId} tz=${timezone}`);
  res.json({ ok: true });
});

// Client syncs its task list to server
app.post('/api/sync', (req, res) => {
  const { clientId, tasks, timezone } = req.body;
  if (!clientId) return res.status(400).json({ error: 'Missing clientId' });

  const db = readDB();
  if (!db.subscriptions[clientId]) {
    return res.status(404).json({ error: 'Not subscribed — please re-enable notifications' });
  }
  db.subscriptions[clientId].tasks    = tasks || [];
  db.subscriptions[clientId].timezone = timezone || db.subscriptions[clientId].timezone || 'UTC';
  db.subscriptions[clientId].updatedAt = new Date().toISOString();
  writeDB(db);
  console.log(`[sync] clientId=${clientId} tasks=${tasks?.length}`);
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (req, res) => {
  const db = readDB();
  res.json({ ok: true, subscribers: Object.keys(db.subscriptions).length });
});

// Serve the PWA client
app.use(express.static(path.join(__dirname, 'client')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// ── Push notification scheduler ───────────────────────────
// Runs every minute — checks each subscriber's tasks against their local time
cron.schedule('* * * * *', async () => {
  const db = readDB();
  const entries = Object.entries(db.subscriptions);
  if (entries.length === 0) return;

  const now = new Date();
  let fired = 0;

  for (const [clientId, entry] of entries) {
    const { subscription, tasks, timezone } = entry;
    if (!subscription || !tasks?.length) continue;

    // Get current time in the subscriber's timezone
    let clientNow;
    try {
      clientNow = new Date(now.toLocaleString('en-US', { timeZone: timezone || 'UTC' }));
    } catch {
      clientNow = now;
    }

    const hh      = clientNow.getHours().toString().padStart(2, '0');
    const mm      = clientNow.getMinutes().toString().padStart(2, '0');
    const dayIdx  = clientNow.getDay();
    const timeNow = `${hh}:${mm}`;

    for (const task of tasks) {
      if (!task.days?.includes(dayIdx) || task.time !== timeNow) continue;

      const payload = JSON.stringify({
        title: `⏰ ${task.title}`,
        body:  task.note ? task.note : `${task.time} · ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayIdx]}`,
        tag:   `ws-${task.id}`,
        url:   '/',
      });

      try {
        await webpush.sendNotification(subscription, payload);
        fired++;
        console.log(`[push] sent "${task.title}" → ${clientId}`);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription is gone — remove it
          console.log(`[push] subscription expired for ${clientId}, removing`);
          delete db.subscriptions[clientId];
          writeDB(db);
        } else {
          console.error(`[push] error for ${clientId}:`, err.statusCode, err.body);
        }
      }
    }
  }
  if (fired > 0) console.log(`[cron] sent ${fired} notification(s)`);
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀  Weekly Scheduler server running on port ${PORT}`);
  console.log(`   Open: http://localhost:${PORT}\n`);
});
