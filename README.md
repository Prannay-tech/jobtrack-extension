# JobTrack — Chrome Extension

Log job applications in one keystroke. Auto-saves to Google Sheets, analyzes roles with AI, and syncs to Google Calendar.

![Version](https://img.shields.io/badge/version-3.0.0-blue) ![MV3](https://img.shields.io/badge/Manifest-V3-green)

---

## Features

| Feature | Description |
|---|---|
| ⌨️ **One-shortcut logging** | Press `Cmd+Shift+X` (Mac) / `Ctrl+Shift+X` (Win) on any job page |
| 🤖 **AI analysis** | Auto-extracts role brief, YOE requirement, and top skills via Groq |
| 📊 **Dashboard** | 14-day activity chart, pipeline funnel, streak counter |
| 📅 **Calendar sync** | Daily count events, follow-up reminders, interview events |
| 🔄 **Status tracking** | Click to cycle: Applied → Phone Screen → Interview → Offer → Rejected |
| 🔔 **Stale reminders** | Badge alert for applications stuck at "Applied" for 7+ days |
| ⬇️ **CSV export** | One-click download of all applications |
| 🔍 **Duplicate detection** | Warns before logging the same job twice |
| 📝 **Notes overlay** | Add notes + follow-up date before every log |

---

## Supported Job Sites

| Site | Scraper |
|---|---|
| LinkedIn | ✅ Dedicated |
| Indeed | ✅ Dedicated |
| Glassdoor | ✅ Dedicated |
| Greenhouse | ✅ Dedicated |
| Lever | ✅ Dedicated |
| Workday / myworkdayjobs | ✅ Dedicated |
| Google Careers | ✅ Dedicated |
| Ashby | ✅ Dedicated |
| SmartRecruiters | ✅ Dedicated |
| Amazon Jobs | ✅ Dedicated |
| Microsoft Careers | ✅ Dedicated |
| Meta Careers | ✅ Dedicated |
| BambooHR | ✅ Dedicated |
| ADP Workforcenow | ✅ Dedicated |
| UKG / UltiPro | ✅ Dedicated |
| 15+ others | ✅ Smart generic fallback (JSON-LD, OG tags, hostname) |

---

## Setup Guide

### 1. Google Cloud — Sheets + Calendar API

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **New Project**
2. **APIs & Services → Library** → Enable:
   - **Google Sheets API**
   - **Google Calendar API**
3. **APIs & Services → OAuth consent screen**
   - User type: External → Create
   - Add scopes: `spreadsheets` + `calendar.events`
   - Add your Gmail as a **Test user**
4. **Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Chrome Extension**
   - Add your Extension ID (get it from `chrome://extensions` after step 3)
   - Copy the **Client ID**

### 2. Paste Client ID into manifest.json

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  ...
}
```

### 3. Deploy the AI Worker (Cloudflare + Groq)

Get a free API key at [console.groq.com](https://console.groq.com), then:

```bash
cd cloudflare-worker
npm install -g wrangler
wrangler login
wrangler kv namespace create JOBTRACK_KV   # paste ID into wrangler.toml
wrangler secret put GROQ_API_KEY           # paste Groq key when prompted
wrangler deploy
```

Copy the worker URL (e.g. `https://jobtrack-ai.yourname.workers.dev`) and paste it into `background.js`:
```js
const WORKER_URL = "https://jobtrack-ai.yourname.workers.dev";
```

### 4. Load the Extension

1. `chrome://extensions` → Enable **Developer mode**
2. **Load unpacked** → select the `jobtrack-extension` folder
3. Note the **Extension ID** → add it to your Google Cloud OAuth credential

### 5. Configure

1. Click the **JobTrack** icon → gear ⚙ → paste your Google Sheet ID → **Save**
2. Press **Cmd+Shift+X** on any job page — Chrome will prompt you to sign in with Google

---

## Google Sheet Structure

Headers (auto-created on first use):

| Date | Company | Job Title | URL | Job Site | Status | Notes | Brief | YOE | Top Skills |
|---|---|---|---|---|---|---|---|---|---|
| 2026-04-11 | Stripe | Software Engineer | https://... | Lever | Applied | Referred by Jane | Builds payment infra | Mid (3-5y) | Go, Kubernetes, gRPC |

---

## File Structure

```
jobtrack-extension/
├── manifest.json              # MV3 — permissions, OAuth, commands
├── background.js              # Service worker — Sheets, Calendar, AI, storage
├── content.js                 # Content script — scraping + log overlay UI
├── popup.html                 # Extension popup
├── popup.js                   # Popup logic — tabs, charts, CSV, status cycling
├── privacy-policy.html        # Privacy policy for Chrome Web Store
├── icons/
│   ├── icon16.png / .svg
│   ├── icon48.png / .svg
│   └── icon128.png / .svg
└── cloudflare-worker/
    ├── worker.js              # Groq proxy with rate limiting
    ├── wrangler.toml          # Cloudflare Worker config
    └── DEPLOY.md              # Deployment instructions
```

---

## Keyboard Shortcut

| Platform | Shortcut |
|---|---|
| Mac | `Cmd + Shift + X` |
| Windows / Linux | `Ctrl + Shift + X` |

To change: `chrome://extensions/shortcuts` → JobTrack → "Log current job application"

---

## Troubleshooting

**Shortcut not working** → Go to `chrome://extensions/shortcuts` and manually set the shortcut for JobTrack.

**"Could not extract job details"** → Refresh the page and wait for it to fully load before pressing the shortcut.

**"Authentication failed"** → Go to Google Cloud Console → OAuth consent screen → add your Gmail as a Test user.

**AI fields are empty** → Check that the Cloudflare Worker is deployed and `WORKER_URL` in `background.js` is set correctly.

**Calendar events not created** → Ensure the Google Calendar API is enabled in your Cloud project and `calendar.events` scope is added to the OAuth consent screen.

---

## Privacy

See [privacy-policy.html](./privacy-policy.html) for the full policy. Summary: your data goes only to your own Google Sheet and Calendar. Job description text is sent to our Groq proxy for AI analysis and is not stored.
