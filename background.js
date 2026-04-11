// JobTrack — background service worker (Manifest V3) — v2 + AI

const SHEETS_API  = (sheetId, path) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`;

// ⚠️ Replace with your Cloudflare Worker URL after deploying
const WORKER_URL  = "https://jobtrack-ai.prannay-khush5501.workers.dev";

const HEADER_ROW  = ["Date", "Company", "Job Title", "URL", "Job Site", "Status", "Notes", "Brief", "YOE", "Top Skills"];
const STATUS_COL  = "F";
const HEADER_COLS = "A:J"; // expanded to 10 columns

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ── Auth helper ───────────────────────────────────────────────────────────────
function getToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(token);
    });
  });
}

// ── Install / startup ─────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("followup-check", { periodInMinutes: 60 * 24 });
  updateBadge();
});
chrome.runtime.onStartup.addListener(updateBadge);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "followup-check") updateBadge();
});

// ── Badge: stale "Applied" apps (7+ days) ────────────────────────────────────
async function updateBadge() {
  const { applications = [] } = await chrome.storage.local.get("applications");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const stale = applications.filter(
    (a) => a.status === "Applied" && new Date(a.date) < cutoff
  );
  if (stale.length > 0) {
    chrome.action.setBadgeText({ text: String(stale.length) });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// ── AI analysis via Cloudflare Worker ────────────────────────────────────────
async function analyzeJobWithAI(details) {
  if (!WORKER_URL || WORKER_URL === "YOUR_WORKER_URL_HERE") {
    return { brief: "", yoe: "Not specified", skills: "" };
  }
  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: details.jobDescription || "",
        title:          details.title,
        company:        details.company,
      }),
    });
    if (!res.ok) return { brief: "", yoe: "Not specified", skills: "" };
    return await res.json();
  } catch (err) {
    console.warn("JobTrack: AI analysis failed (non-blocking)", err);
    return { brief: "", yoe: "Not specified", skills: "" };
  }
}

// ── Command listener ──────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "log-application") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Inject content script if needed
  let details;
  try {
    details = await chrome.tabs.sendMessage(tab.id, { action: "extractJobDetails" });
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      details = await chrome.tabs.sendMessage(tab.id, { action: "extractJobDetails" });
    } catch (err) {
      console.error("JobTrack: content script error", err);
      showNotification("error", "Could not extract job details from this page.");
      return;
    }
  }

  if (!details?.title) {
    showNotification("error", "No job title found on this page.");
    return;
  }

  // ── Duplicate detection ───────────────────────────────────────────────────
  const { applications = [] } = await chrome.storage.local.get("applications");
  const duplicate = applications.find((a) => a.url === details.url);
  if (duplicate) {
    showNotification("error", `Already logged on ${duplicate.date}: ${duplicate.title}`);
    return;
  }

  // ── Kick off AI analysis in parallel with showing overlay ────────────────
  const aiPromise = analyzeJobWithAI(details);

  // ── Show overlay for notes ────────────────────────────────────────────────
  let overlayResult = { confirmed: true, notes: "" };
  try {
    overlayResult = await chrome.tabs.sendMessage(tab.id, {
      action: "showLogOverlay",
      details,
    });
  } catch { /* proceed without overlay */ }

  if (!overlayResult?.confirmed) return;

  // ── Get Sheet ID ──────────────────────────────────────────────────────────
  const { sheetId } = await chrome.storage.local.get("sheetId");
  if (!sheetId) {
    showNotification("error", "No Sheet ID set. Click the extension icon to configure.");
    return;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  let token;
  try {
    token = await getToken(true);
  } catch (err) {
    console.error("JobTrack: auth error", err);
    showNotification("error", "Authentication failed. Check your OAuth setup.");
    return;
  }

  // ── Await AI result (usually already done by now) ─────────────────────────
  const ai = await aiPromise;

  const entry = {
    date:     details.date,
    company:  details.company || "Unknown",
    title:    details.title,
    url:      details.url,
    jobSite:  details.jobSite,
    status:   "Applied",
    notes:    overlayResult.notes || "",
    brief:    ai.brief   || "",
    yoe:      ai.yoe     || "Not specified",
    skills:   ai.skills  || "",
    sheetRow: null,
  };

  // ── Write to Sheet ────────────────────────────────────────────────────────
  try {
    await ensureHeader(token, sheetId);
    const appendResp = await appendRow(token, sheetId, entry);
    const rangeStr   = appendResp?.updates?.updatedRange || "";
    const rowMatch   = rangeStr.match(/:J(\d+)$/) || rangeStr.match(/(\d+)$/);
    if (rowMatch) entry.sheetRow = parseInt(rowMatch[1], 10);
  } catch (err) {
    console.error("JobTrack: Sheets API error", err);
    showNotification("error", "Failed to write to Google Sheet.");
    return;
  }

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
});

async function handleStatusUpdate({ appIndex, newStatus }) {
  const { applications = [], sheetId } =
    await chrome.storage.local.get(["applications", "sheetId"]);

  const app = applications[appIndex];
  if (!app) return { success: false };

  app.status = newStatus;
  await chrome.storage.local.set({ applications });
  await updateBadge();

  if (app.sheetRow && sheetId) {
    try {
      const token = await getToken(false);
      await fetch(
        SHEETS_API(sheetId, `/values/Sheet1!${STATUS_COL}${app.sheetRow}?valueInputOption=RAW`),
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [[newStatus]] }),
        }
      );
    } catch (err) {
      console.warn("JobTrack: Sheet status sync failed", err);
    }
  }

  return { success: true };
}

// ── Sheets helpers ────────────────────────────────────────────────────────────
async function ensureHeader(token, sheetId) {
  const res  = await fetch(SHEETS_API(sheetId, "/values/Sheet1!A1:J1"),
    { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!data.values || data.values[0]?.[0] !== "Date") {
    await fetch(
      SHEETS_API(sheetId, "/values/Sheet1!A1:J1?valueInputOption=RAW"),
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [HEADER_ROW] }),
      }
    );
  }
}

async function appendRow(token, sheetId, entry) {
  const row = [
    entry.date, entry.company, entry.title, entry.url,
    entry.jobSite, entry.status, entry.notes,
    entry.brief, entry.yoe, entry.skills,
  ];
  const res = await fetch(
    SHEETS_API(sheetId, `/values/Sheet1!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Sheets append failed");
  }
  return res.json();
}

// ── Local storage ─────────────────────────────────────────────────────────────
async function saveLocal(entry) {
  const { applications = [], dailyCounts = {} } =
    await chrome.storage.local.get(["applications", "dailyCounts"]);
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
