// JobTrack — background service worker (Manifest V3) — v4 (Supabase)

// TODO: Replace with your production web app URL
const WEB_APP_URL  = "https://jobtrack-p71o7vib2-prannay-khushalanis-projects.vercel.app";
const WORKER_URL   = "https://jobtrack-ai.prannay-khush5501.workers.dev";

function todayKey() { return new Date().toISOString().slice(0, 10); }

// ── Install / startup ─────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("followup-check", { periodInMinutes: 60 * 24 });
  updateBadge();
});
chrome.runtime.onStartup.addListener(updateBadge);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "followup-check") updateBadge();
});

// ── Badge ─────────────────────────────────────────────────────────────────────
async function updateBadge() {
  const { applications = [] } = await chrome.storage.local.get("applications");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const stale = applications.filter((a) => a.status === "Applied" && new Date(a.date) < cutoff);
  chrome.action.setBadgeText({ text: stale.length > 0 ? String(stale.length) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
}

// ── AI analysis ───────────────────────────────────────────────────────────────
async function analyzeJobWithAI(details) {
  if (!WORKER_URL || WORKER_URL === "YOUR_WORKER_URL_HERE") {
    return { title: "", company: "", location: "", brief: "", yoe: "Not specified", skills: "" };
  }
  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageText: details.pageText || "",
        url:      details.url,
      }),
    });
    if (!res.ok) return { title: "", company: "", location: "", brief: "", yoe: "Not specified", skills: "" };
    return await res.json();
  } catch {
    return { title: "", company: "", location: "", brief: "", yoe: "Not specified", skills: "" };
  }
}

// ── Post to Supabase via web app API ──────────────────────────────────────────
async function postToAPI(entry) {
  const { apiToken } = await chrome.storage.local.get("apiToken");
  if (!apiToken) return { success: false, error: "Not connected" };

  try {
    const res = await fetch(`${WEB_APP_URL}/api/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        date:            entry.date,
        company:         entry.company,
        title:           entry.title,
        url:             entry.url,
        job_site:        entry.jobSite,
        location:        entry.location,
        status:          entry.status,
        notes:           entry.notes,
        brief:           entry.brief,
        yoe:             entry.yoe,
        skills:          entry.skills,
        job_description: entry.jobDescription,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Handle duplicate
      if (res.status === 409 && data.duplicate) {
        return { success: false, error: data.error, duplicate: true };
      }
      return { success: false, error: data.error || "API error" };
    }

    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: "Network error — is the dashboard deployed?" };
  }
}

// ── Command listener ──────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "log-application") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Check connection first
  const { apiToken } = await chrome.storage.local.get("apiToken");
  if (!apiToken) {
    showNotification("error", "Not connected. Click the JobTrack icon to connect your account.");
    return;
  }

  // Inject content script if needed
  let details;
  try {
    details = await chrome.tabs.sendMessage(tab.id, { action: "extractJobDetails" });
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      details = await chrome.tabs.sendMessage(tab.id, { action: "extractJobDetails" });
    } catch (err) {
      showNotification("error", "Could not extract job details from this page.");
      return;
    }
  }

  // Local duplicate detection (fast)
  const { applications = [] } = await chrome.storage.local.get("applications");
  const dup = applications.find((a) => a.url === details.url);
  if (dup) { showNotification("error", `Already logged on ${dup.date}: ${dup.title}`); return; }

  // Kick off AI in parallel with overlay
  const aiPromise = analyzeJobWithAI(details);

  // Show overlay immediately with fast-path data
  let overlayResult = { confirmed: true, notes: "", followUpDate: null, details };
  try {
    const overlayPromise = chrome.tabs.sendMessage(tab.id, { action: "showLogOverlay", details });

    // As soon as AI responds, push the verified data to the overlay
    aiPromise.then((ai) => {
      if (ai.title || ai.company) {
        chrome.tabs.sendMessage(tab.id, { action: "aiDetailsReady", aiDetails: ai }).catch(() => {});
      }
    });

    overlayResult = await overlayPromise;
  } catch { /* proceed without overlay */ }

  if (!overlayResult?.confirmed) return;

  // Use overlay's final details (may have been AI-updated while overlay was open)
  const finalDetails = overlayResult.details || details;
  const ai = await aiPromise;

  // Merge: AI fields take precedence for title/company if DOM scrape was weak
  const entry = {
    date:        finalDetails.date,
    company:     finalDetails.company || ai.company || "Unknown",
    title:       finalDetails.title   || ai.title   || "Unknown Title",
    url:         finalDetails.url,
    jobSite:     finalDetails.jobSite,
    location:    ai.location || "",
    status:      "Applied",
    notes:       overlayResult.notes || "",
    brief:       ai.brief   || "",
    yoe:         ai.yoe     || "Not specified",
    skills:      ai.skills  || "",
    jobDescription: (finalDetails.pageText || "").slice(0, 8000),
  };

  // Post to Supabase via web app API
  const result = await postToAPI(entry);

  if (!result.success) {
    if (result.duplicate) {
      showNotification("error", result.error);
    } else {
      showNotification("error", `Failed: ${result.error}`);
    }
    return;
  }

  // Save locally for popup display
  entry.id = result.id;
  await saveLocal(entry);
  await updateBadge();

  showNotification("success", `Logged: ${entry.title} @ ${entry.company}`);
});

// ── Message listener (popup → background) ────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "updateStatus") {
    handleStatusUpdate(message).then(sendResponse).catch(() => sendResponse({ success: false }));
    return true;
  }
  if (message.action === "deleteApplication") {
    handleDelete(message).then(sendResponse).catch(() => sendResponse({ success: false }));
    return true;
  }
  if (message.action === "connectAccount") {
    // Open the web app connect page — the popup handles the postMessage flow
    chrome.tabs.create({ url: `${WEB_APP_URL}/connect` });
    sendResponse({ success: true });
    return true;
  }
  if (message.action === "openDashboard") {
    chrome.tabs.create({ url: `${WEB_APP_URL}/dashboard` });
    sendResponse({ success: true });
    return true;
  }
  if (message.action === "disconnect") {
    chrome.storage.local.remove(["apiToken", "connectedEmail"]);
    sendResponse({ success: true });
    return true;
  }
  if (message.action === "saveToken") {
    // Called by content script on the /connect page when token is ready
    const { token, email } = message;
    if (token) {
      chrome.storage.local.set({ apiToken: token, connectedEmail: email || "" });
      showNotification("success", `Connected as ${email || "unknown"}. You're all set!`);
    }
    sendResponse({ success: !!token });
    return true;
  }
});

async function handleStatusUpdate({ appIndex, newStatus }) {
  const { applications = [], apiToken } = await chrome.storage.local.get(["applications", "apiToken"]);
  const app = applications[appIndex];
  if (!app) return { success: false };

  // Update locally
  app.status = newStatus;
  await chrome.storage.local.set({ applications });
  await updateBadge();

  // Sync to Supabase
  if (app.id && apiToken) {
    try {
      await fetch(`${WEB_APP_URL}/api/log`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ id: app.id, status: newStatus }),
      });
    } catch (err) { console.warn("Status sync failed", err); }
  }

  return { success: true };
}

async function handleDelete({ appIndex }) {
  const { applications = [] } = await chrome.storage.local.get("applications");
  const app = applications[appIndex];
  if (!app) return { success: false };

  applications.splice(appIndex, 1);
  await chrome.storage.local.set({ applications });
  await updateBadge();

  return { success: true };
}

// ── Local storage ─────────────────────────────────────────────────────────────
async function saveLocal(entry) {
  const { applications = [], dailyCounts = {} } = await chrome.storage.local.get(["applications", "dailyCounts"]);
  applications.unshift(entry);
  const key = todayKey();
  dailyCounts[key] = (dailyCounts[key] || 0) + 1;
  await chrome.storage.local.set({ applications, dailyCounts });
}

// ── Notifications ─────────────────────────────────────────────────────────────
function showNotification(type, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon48.png"),
    title: type === "success" ? "JobTrack — Logged!" : "JobTrack — Heads up",
    message,
  });
}
