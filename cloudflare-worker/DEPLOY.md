# Deploy the JobTrack AI Worker

## Prerequisites
- Free [Cloudflare account](https://cloudflare.com)
- Free [Groq account](https://console.groq.com) → API key
- Node.js installed

## Steps

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 2. Create KV namespace (for rate limiting)
```bash
cd cloudflare-worker
wrangler kv:namespace create JOBTRACK_KV
```
Copy the `id` from the output and paste it into `wrangler.toml` replacing `PASTE_YOUR_KV_NAMESPACE_ID_HERE`.

### 3. Set your Groq API key as a secret
```bash
wrangler secret put GROQ_API_KEY
# Paste your Groq API key when prompted
```

### 4. Deploy
```bash
wrangler deploy
```

You'll get a URL like:
```
https://jobtrack-ai.YOUR_SUBDOMAIN.workers.dev
```

### 5. Update the extension
Open `background.js` and replace:
```js
const WORKER_URL = "YOUR_WORKER_URL_HERE";
```
with your actual worker URL, e.g.:
```js
const WORKER_URL = "https://jobtrack-ai.myname.workers.dev";
```

Also update `manifest.json` host_permissions to include your worker URL.

Then reload the extension at chrome://extensions.

## Rate limits
- 30 AI analyses per IP per day (free, no cost to user)
- Groq free tier: 14,400 requests/day total
- Groq paid: $0.05/1M tokens (~$0.000075 per job analysis)
