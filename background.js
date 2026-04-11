// JobTrack — background service worker (Manifest V3) — v3

const SHEETS_API   = (sheetId, path) => `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}`;
const CALENDAR_API = "https://calendar.googleapis.com/calendar/v3/calendars/primary/events";
const WORKER_URL   = "https://jobtrack-ai.prannay-khush5501.workers.dev";

const HEADER_ROW  = ["Date", "Company", "Job Title", "URL", "Job Site", "Status", "Notes", "Brief", "YOE", "Top Skills"];
const STATUS_COL  = "F";

function todayKey() { return new Date().toISOString().slice(0, 10); }

// ── Auth ──────────────────────────────────────────────────────────────────────
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
    return { brief: "", yoe: "Not specified", skills: "" };
  }
  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: details.jobDescription || "",
        title: details.title,
        company: details.company,
      }),
    });
    if (!res.ok) return { brief: "", yoe: "Not specified", skills: "" };
    return await res.json();
  } catch {
    return { brief: "", yoe: "Not specified", skills: "" };
  }
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

// Creates or updates the all-day "X applications today" event for a given date
async function createOrUpdateDailyEvent(token, date, count) {
  try {
    const { calEventIds = {} } = await chrome.storage.local.get("calEventIds");
    const existingId = calEventIds[date];

    const body = {
      summary: `📋 JobTrack: ${count} application${count !== 1 ? "s" : ""} today`,
      start: { date },
      end:   { date },
      description: `You logged ${count} job application${count !== 1 ? "s" : ""} on ${date} via JobTrack.`,
      colorId: "7", // peacock
    };

    let eventId = null;

    if (existingId) {
      const res = await fetch(`${CALENDAR_API}/${existingId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) eventId = existingId;
    }

    if (!eventId) {
      const res = await fetch(CALENDAR_API, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        eventId = data.id;
      }
    }

    if (eventId) {
      calEventIds[date] = eventId;
      await chrome.storage.local.set({ calEventIds });
    }
  } catch (err) {
    console.warn("JobTrack: calendar daily event failed", err);
  }
}

// Creates a follow-up reminder event on a specific date
async function createFollowUpEvent(token, entry, followUpDate) {
  try {
    await fetch(CALENDAR_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `📬 Follow up: ${entry.title} @ ${entry.company}`,
        start: { date: followUpDate },
        end:   { date: followUpDate },
        description: `Follow up on your application for:\n${entry.title} at ${entry.company}\n\n🔗 ${entry.url}`,
        colorId: "5", // banana
      }),
    });
  } catch (err) {
    console.warn("JobTrack: follow-up event failed", err);
  }
}

// Creates an interview calendar event with a 1-hour duration
async function createInterviewEvent(token, entry, dateTimeLocal) {
  try {
    const start = new Date(dateTimeLocal);
    const end   = new Date(start.getTime() + 60 * 60 * 1000);
    const res = await fetch(CALENDAR_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `🗓️ Interview: ${entry.title} @ ${entry.company}`,
        start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end:   { dateTime: end.toISOString(),   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        description: `Interview for ${entry.title} at ${entry.company}\n\n🔗 ${entry.url}`,
        colorId: "2", // sage
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("JobTrack: interview event failed", err);
    return false;
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
      showNotification("error", "Could not extract job details from this page.");
      return;
    }
  }

  if (!details?.title) { showNotification("error", "No job title found on this page."); return; }

  // Duplicate detection
  const { applications = [] } = await chrome.storage.local.get("applications");
  const dup = applications.find((a) => a.url === details.url);
  if (dup) { showNotification("error", `Already logged on ${dup.date}: ${dup.title}`); return; }

  // Kick off AI in parallel with overlay
  const aiPromise = analyzeJobWithAI(details);

  // Show overlay for notes + follow-up date
  let overlayResult = { confirmed: true, notes: "", followUpDate: null };
  try {
    overlayResult = await chrome.tabs.sendMessage(tab.id, { action: "showLogOverlay", details });
  } catch { /* proceed without overlay */ }

  if (!overlayResult?.confirmed) return;

  // Sheet ID check
  const { sheetId } = await chrome.storage.local.get("sheetId");
  if (!sheetId) { showNotification("error", "No Sheet ID set. Click the extension icon to configure."); return; }

  // Auth
  let token;
  try {
    token = await getToken(true);
  } catch {
    showNotification("error", "Authentication failed. Check your OAuth setup.");
    return;
  }

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

  // Write to Sheet
  try {
    await ensureHeader(token, sheetId);
    const appendResp = await appendRow(token, sheetId, entry);
    const rangeStr   = appendResp?.updates?.updatedRange || "";
    const rowMatch   = rangeStr.match(/:J(\d+)$/) || rangeStr.match(/(\d+)$/);
    if (rowMatch) entry.sheetRow = parseInt(rowMatch[1], 10);
  } catch (err) {
    showNotification("error", "Failed to write to Google Sheet.");
    return;
  }

  // Save locally
  await saveLocal(entry);
  await updateBadge();

  // Calendar: daily summary + optional follow-up reminder
  const today = todayKey();
  const { dailyCounts = {} } = await chrome.storage.local.get("dailyCounts");
  const todayCount = dailyCounts[today] || 1;

  createOrUpdateDailyEvent(token, today, todayCount); // non-blocking
  if (overlayResult.followUpDate) {
    createFollowUpEvent(token, entry, overlayResult.followUpDate); // non-blocking
  }

  showNotification("success", `Logged: ${entry.title} @ ${entry.company}`);
});

// ── Message listener (popup → background) ────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "updateStatus") {
    handleStatusUpdate(message).then(sendResponse).catch(() => sendResponse({ success: false }));
    return true;
  }
  if (message.action === "createInterviewEvent") {
    handleInterviewEvent(message).then(sendResponse).catch(() => sendResponse({ success: false }));
    return true;
  }
});

async function handleStatusUpdate({ appIndex, newStatus }) {
  const { applications = [], sheetId } = await chrome.storage.local.get(["applications", "sheetId"]);
  const app = applications[appIndex];
  if (!app) return { success: false };

  app.status = newStatus;
  await chrome.storage.local.set({ applications });
  await updateBadge();

  if (app.sheetRow && sheetId) {
    try {
      const token = await getToken(false);
      await fetch(SHEETS_API(sheetId, `/values/Sheet1!${STATUS_COL}${app.sheetRow}?valueInputOption=RAW`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [[newStatus]] }),
      });
    } catch (err) { console.warn("Sheet status sync failed", err); }
  }

  return { success: true };
}

async function handleInterviewEvent({ appIndex, dateTimeLocal }) {
  const { applications = [] } = await chrome.storage.local.get("applications");
  const app = applications[appIndex];
  if (!app || !dateTimeLocal) return { success: false };

  try {
    const token = await getToken(false);
    const ok = await createInterviewEvent(token, app, dateTimeLocal);
    return { success: ok };
  } catch {
    return { success: false };
  }
}

// ── Sheets helpers ────────────────────────────────────────────────────────────
async function ensureHeader(token, sheetId) {
  const res  = await fetch(SHEETS_API(sheetId, "/values/Sheet1!A1:J1"), { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!data.values || data.values[0]?.[0] !== "Date") {
    await fetch(SHEETS_API(sheetId, "/values/Sheet1!A1:J1?valueInputOption=RAW"), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [HEADER_ROW] }),
    });
  }
}

async function appendRow(token, sheetId, entry) {
  const row = [entry.date, entry.company, entry.title, entry.url, entry.jobSite, entry.status, entry.notes, entry.brief, entry.yoe, entry.skills];
  const res = await fetch(SHEETS_API(sheetId, "/values/Sheet1!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [row] }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Append failed"); }
  return res.json();
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
