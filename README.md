# WS
# Weekly Scheduler — iOS Push Notifications

A weekly recurring task scheduler with **true background push notifications** that work on iOS.

---

## How It Works

- A Node.js server stores your task schedule and runs a cron job every minute
- When a task is due, the server sends a push notification to your phone via Apple's push infrastructure
- Works even when your phone is locked or the browser is closed

---

## Deploy to Railway (Free)

### Step 1 — Generate VAPID keys

VAPID keys authenticate your server with Apple/Google push services.

```bash
npm install
npm run generate-keys
```

Copy the two lines it prints — you'll need them in Step 3.

### Step 2 — Push to GitHub

1. Create a new repo on github.com
2. Push this folder to it:

```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 3 — Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your repo
4. Once deployed, go to your project → **Variables** tab and add:

```
VAPID_PUBLIC   = (paste from Step 1)
VAPID_PRIVATE  = (paste from Step 1)
VAPID_EMAIL    = mailto:your@email.com
```

5. Railway will redeploy automatically. Copy your public URL (e.g. `https://yourapp.up.railway.app`)

---

## iOS Setup (one-time per device)

iOS only allows push notifications from **installed** PWAs. Do this on your iPhone:

1. Open your Railway URL in **Safari** (must be Safari, not Chrome)
2. Tap the **Share button** (square with arrow ↑)
3. Tap **Add to Home Screen**
4. Open the app from your Home Screen
5. Tap **🔕 Enable Alerts** and tap **Allow** when prompted

That's it — notifications will now arrive even when your phone is asleep.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Generate keys and create .env
npm run generate-keys  # copy output into .env
cp .env.example .env   # then edit .env with your keys

# 3. Start server
npm start
# → http://localhost:3000
```

> **Note:** Push notifications require HTTPS in production. For local testing, use a tool like [ngrok](https://ngrok.com) to create a public HTTPS URL.

---

## Project Structure

```
weekly-scheduler/
├── server.js          # Express server + cron scheduler
├── package.json
├── .env.example       # Copy to .env and fill in keys
├── db.json            # Auto-created — stores subscriptions + tasks
└── client/
    ├── index.html     # Full PWA app
    ├── sw.js          # Service worker (handles push events)
    ├── manifest.json  # PWA manifest
    └── icon.png       # App icon
```

---

## Browser Support

| Platform       | Works? | Notes                              |
|----------------|--------|------------------------------------|
| iOS Safari     | ✅     | Must be added to Home Screen first |
| Android Chrome | ✅     | Works in browser tab               |
| Mac Chrome     | ✅     | Works in browser tab               |
| Mac Safari     | ✅     | macOS 13+                          |
| Firefox        | ✅     | Works in browser tab               |

---

## Notes

- **Task data** is stored in your browser's localStorage (your phone). The server only keeps a copy for scheduling. If you clear browser data, re-open the app — it will show empty but the server still has your schedule until you re-sync.
- **Server data** lives in `db.json`. On Railway, this persists between restarts but resets on fresh deploys. Your phone will re-sync automatically on next app open.
- For a more permanent setup, connect a Railway PostgreSQL database and update the read/write functions in `server.js`.

