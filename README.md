# JobTrack Chrome Extension

Log job applications instantly with a keyboard shortcut. Saves to Google Sheets automatically.

---

## Setup Guide

### 1. Create a Google Cloud Project & OAuth Credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **New Project**
2. In the left sidebar: **APIs & Services → Library**
3. Search for **Google Sheets API** → Enable it
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Choose **Application type: Chrome Extension**
6. Enter your extension's ID (you'll get this in step 4 below — come back after loading the extension)
7. Copy the generated **Client ID**

### 2. Add Your Client ID to the Extension

Open `manifest.json` and replace the placeholder:

```json
"oauth2": {
  "client_id": "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
  ...
}
```

### 3. Create a Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**
2. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit
   ```

### 4. Load the Extension in Chrome

1. Open Chrome → navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `jobtrack-extension` folder
5. Note your **Extension ID** shown on the card — go back to step 1 and add it to your OAuth credential

### 5. Configure the Extension

1. Click the **JobTrack** icon in your Chrome toolbar
2. Click the **gear icon ⚙** (top-right of popup)
3. Paste your **Google Sheet ID** (or the full Sheet URL — it'll parse the ID automatically)
4. Click **Save**

### 6. Log Your First Application

1. Navigate to any job listing page (LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, or any site)
2. Press **Ctrl+Shift+J** (Windows/Linux) or **⌘+Shift+J** (Mac)
3. The extension scrapes the job title, company, and URL automatically
4. A notification confirms the log
5. The row is appended to your Google Sheet instantly

---

## Google Sheet Structure

The extension auto-creates a header row on first use:

| Date | Company | Job Title | URL | Job Site | Status | Notes |
|------|---------|-----------|-----|----------|--------|-------|
| 2026-04-10 | Acme Corp | Software Engineer | https://... | LinkedIn | Applied | |

---

## Supported Job Sites

| Site | Detection |
|------|-----------|
| LinkedIn | linkedin.com |
| Indeed | indeed.com |
| Glassdoor | glassdoor.com |
| Greenhouse | greenhouse.io |
| Lever | lever.co |
| Workday | workday.com |
| Any other site | Generic fallback (first H1 + hostname) |

---

## File Structure

```
jobtrack-extension/
├── manifest.json       # MV3 manifest with permissions & OAuth config
├── background.js       # Service worker: handles shortcut, Sheets API, storage
├── content.js          # Content script: scrapes job details from pages
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic: stats, settings, open sheet
├── icons/
│   ├── icon16.svg
│   ├── icon48.svg
│   └── icon128.svg
└── README.md
```

---

## Troubleshooting

**"Could not extract job details"** — The content script couldn't inject on that page. Try refreshing and pressing the shortcut again. Some pages with heavy JS may need a moment to load.

**"Authentication failed"** — Your OAuth client ID may be wrong, or you haven't added your Extension ID to the allowed origins in Google Cloud Console.

**"Failed to write to Google Sheet"** — Double-check your Sheet ID and that the Sheets API is enabled in your Google Cloud project.

**Shortcut not working** — Go to `chrome://extensions/shortcuts` and confirm the `Log application` shortcut is set for JobTrack.
